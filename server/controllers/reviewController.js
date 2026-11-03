import mongoose from 'mongoose';
import { z } from 'zod';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import {
  deleteStoredImage,
  isCloudinaryConfigured,
  saveToLocalDisk,
  streamUploadToCloudinary,
} from './uploadController.js';
import { hasAllowedImageSignature } from '../utils/imageValidation.js';

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z
    .string()
    .trim()
    .max(2000, 'Comment must be 2000 characters or less')
    .optional()
    .default(''),
});

const findProductBySlugOrId = async (slugOrId) => {
  const filter = { isActive: true };
  if (mongoose.isValidObjectId(slugOrId)) {
    filter.$or = [{ _id: slugOrId }, { slug: slugOrId }];
  } else {
    filter.slug = slugOrId;
  }
  return Product.findOne(filter);
};

const recalculateProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const ratingAverage = stats
    ? Math.round(stats.ratingAverage * 10) / 10
    : 0;
  const ratingCount = stats?.ratingCount || 0;

  await Product.findByIdAndUpdate(productId, { ratingAverage, ratingCount });
  return { ratingAverage, ratingCount };
};

// GET /api/products/:slug/reviews
export const getProductReviews = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const product = await findProductBySlugOrId(slug);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const [reviews, total] = await Promise.all([
      Review.find({ product: product._id })
        .populate('user', 'name')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ product: product._id }),
    ]);

    res.json({
      reviews,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/products/:slug/reviews
export const createReview = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { rating, comment } = createReviewSchema.parse(req.body);
    const files = req.files || [];
    if (files.some((file) => !hasAllowedImageSignature(file))) {
      res.status(400);
      throw new Error('Review photos must be valid JPG, PNG, or WebP images');
    }

    const product = await findProductBySlugOrId(slug);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const existing = await Review.findOne({
      product: product._id,
      user: req.user._id,
    });
    if (existing) {
      res.status(400);
      throw new Error('You have already reviewed this product');
    }

    if (files.length && process.env.VERCEL && !isCloudinaryConfigured()) {
      res.status(503);
      throw new Error('Review photos require Cloudinary storage on this deployment.');
    }

    const uploadedImages = [];
    try {
      for (const file of files) {
        let image;
        if (isCloudinaryConfigured()) {
          image = await streamUploadToCloudinary(file.buffer, 'karakoram-store/reviews');
        } else {
          const extension = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
          }[file.mimetype];
          image = await saveToLocalDisk(
            req,
            { ...file, originalname: `review${extension}` },
            'reviews'
          );
        }
        uploadedImages.push({ url: image.url, publicId: image.publicId });
      }
    } catch (uploadError) {
      await Promise.all(uploadedImages.map((image) => deleteStoredImage(image.publicId)));
      throw uploadError;
    }

    let review;
    try {
      review = await Review.create({
        product: product._id,
        user: req.user._id,
        rating,
        comment: comment || '',
        images: uploadedImages,
      });
    } catch (err) {
      await Promise.all(uploadedImages.map((image) => deleteStoredImage(image.publicId)));
      if (err.code === 11000) {
        res.status(400);
        throw new Error('You have already reviewed this product');
      }
      throw err;
    }

    const { ratingAverage, ratingCount } = await recalculateProductRating(product._id);

    await review.populate('user', 'name');

    res.status(201).json({
      review,
      ratingAverage,
      ratingCount,
    });
  } catch (err) {
    next(err);
  }
};
