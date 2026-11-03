import { beforeEach, describe, expect, it, vi } from 'vitest';
import Review from '../../models/Review.js';
import Product from '../../models/Product.js';
import {
  isCloudinaryConfigured,
  streamUploadToCloudinary,
} from '../../controllers/uploadController.js';
import { createReview } from '../../controllers/reviewController.js';

vi.mock('../../models/Review.js', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
  },
}));
vi.mock('../../models/Product.js', () => ({
  default: {
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));
vi.mock('../../controllers/uploadController.js', () => ({
  deleteStoredImage: vi.fn().mockResolvedValue(undefined),
  isCloudinaryConfigured: vi.fn(),
  saveToLocalDisk: vi.fn(),
  streamUploadToCloudinary: vi.fn(),
}));

describe('createReview photo uploads', () => {
  let req;
  let res;
  let next;
  const product = {
    _id: '507f1f77bcf86cd799439011',
    ratingAverage: 0,
    ratingCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { slug: 'apricot-oil' },
      body: { rating: '5', comment: 'Excellent quality' },
      files: [{
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      }],
      user: { _id: 'user-id' },
    };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    Product.findOne.mockResolvedValue(product);
    Review.findOne.mockResolvedValue(null);
    Review.create.mockResolvedValue({ populate: vi.fn().mockResolvedValue(undefined) });
    Review.aggregate.mockResolvedValue([{ ratingAverage: 5, ratingCount: 1 }]);
    Product.findByIdAndUpdate.mockResolvedValue(undefined);
    isCloudinaryConfigured.mockReturnValue(true);
    streamUploadToCloudinary.mockResolvedValue({
      url: 'https://images.example.test/review.png',
      publicId: 'karakoram-store/reviews/review',
    });
  });

  it('stores verified uploaded photos on the review', async () => {
    await createReview(req, res, next);

    expect(streamUploadToCloudinary).toHaveBeenCalledWith(
      req.files[0].buffer,
      'karakoram-store/reviews'
    );
    expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
      images: [{
        url: 'https://images.example.test/review.png',
        publicId: 'karakoram-store/reviews/review',
      }],
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects file content that does not match the declared image type', async () => {
    req.files[0].buffer = Buffer.from('<script>alert(1)</script>');

    await createReview(req, res, next);

    expect(streamUploadToCloudinary).not.toHaveBeenCalled();
    expect(Review.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/valid JPG, PNG, or WebP/i),
    }));
  });
});
