import { z } from 'zod';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Artisan from '../models/Artisan.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

/* ─────────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────────── */

const variantSchema = z.object({
  label: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().length(24),
  artisan: z.string().length(24).optional().nullable(),
  description: z.string().min(10),
  variants: z.array(variantSchema).min(1),
  origin: z.string().optional(),
  isSeasonal: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const adminCreateProduct = async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) { next(err); }
};

export const adminUpdateProduct = async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) { res.status(404); throw new Error('Product not found'); }
    res.json(product);
  } catch (err) { next(err); }
};

export const adminDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404); throw new Error('Product not found'); }

    // Delete associated Cloudinary images
    for (const img of product.images) {
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    }
    if (product.video?.publicId) await cloudinary.uploader.destroy(product.video.publicId, { resource_type: 'video' });

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   CATEGORIES
───────────────────────────────────────────── */

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  image: z.object({ url: z.string(), publicId: z.string() }).optional(),
});

export const adminCreateCategory = async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await Category.create(data);
    res.status(201).json(category);
  } catch (err) { next(err); }
};

export const adminUpdateCategory = async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) { res.status(404); throw new Error('Category not found'); }
    res.json(category);
  } catch (err) { next(err); }
};

export const adminDeleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) { res.status(404); throw new Error('Category not found'); }
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   ARTISANS
───────────────────────────────────────────── */

const artisanSchema = z.object({
  name: z.string().min(2),
  village: z.string().optional(),
  story: z.string().optional(),
  photo: z.object({ url: z.string(), publicId: z.string() }).optional(),
});

export const adminGetArtisans = async (req, res, next) => {
  try {
    const artisans = await Artisan.find().sort('name');
    res.json(artisans);
  } catch (err) { next(err); }
};

export const adminCreateArtisan = async (req, res, next) => {
  try {
    const data = artisanSchema.parse(req.body);
    const artisan = await Artisan.create(data);
    res.status(201).json(artisan);
  } catch (err) { next(err); }
};

export const adminUpdateArtisan = async (req, res, next) => {
  try {
    const data = artisanSchema.partial().parse(req.body);
    const artisan = await Artisan.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!artisan) { res.status(404); throw new Error('Artisan not found'); }
    res.json(artisan);
  } catch (err) { next(err); }
};

export const adminDeleteArtisan = async (req, res, next) => {
  try {
    const artisan = await Artisan.findByIdAndDelete(req.params.id);
    if (!artisan) { res.status(404); throw new Error('Artisan not found'); }
    res.json({ message: 'Artisan deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   COUPONS
───────────────────────────────────────────── */

const couponSchema = z.object({
  code: z.string().min(3).max(20),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderAmount: z.number().min(0).optional(),
  expiry: z.string().datetime(),
  usageLimit: z.number().int().min(1),
});

export const adminGetCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    res.json(coupons);
  } catch (err) { next(err); }
};

export const adminCreateCoupon = async (req, res, next) => {
  try {
    const data = couponSchema.parse(req.body);
    const coupon = await Coupon.create(data);
    res.status(201).json(coupon);
  } catch (err) { next(err); }
};

export const adminUpdateCoupon = async (req, res, next) => {
  try {
    const data = couponSchema.partial().parse(req.body);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
    res.json(coupon);
  } catch (err) { next(err); }
};

export const adminDeleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
    res.json({ message: 'Coupon deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   ORDERS
───────────────────────────────────────────── */

export const adminGetOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { orderStatus: status } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter).populate('user', 'name email').sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, page: Number(page), pages: Math.ceil(total / Number(limit)), total });
  } catch (err) { next(err); }
};

export const adminUpdateOrder = async (req, res, next) => {
  try {
    const schema = z.object({
      orderStatus: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
    });
    const data = schema.parse(req.body);
    const order = await Order.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!order) { res.status(404); throw new Error('Order not found'); }
    res.json(order);
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   STATS (basic sales dashboard)
───────────────────────────────────────────── */

export const adminGetStats = async (req, res, next) => {
  try {
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      Order.countDocuments({ orderStatus: 'pending' }),
      Order.find().sort('-createdAt').limit(5).populate('user', 'name email'),
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers,
      pendingOrders,
      recentOrders,
    });
  } catch (err) { next(err); }
};
