import Product from '../models/Product.js';
import { setPublicCache } from '../utils/cache.js';

const REGION_PATTERNS = {
  hunza: 'Hunza',
  nagar: 'Nagar',
  ghizer: 'Ghizer',
  skardu: 'Skardu',
  astore: 'Astore',
  diamer: 'Diamer',
  // Avoid matching the generic "Gilgit-Baltistan" origin for every product.
  gilgit: 'Gilgit(?!-Baltistan)',
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      region,
      minPrice,
      maxPrice,
      inStock,
      sort = '-createdAt',
      page = 1,
      limit = 12,
    } = req.query;

    const filter = { isActive: true };

    // Full-text search
    if (search) filter.$text = { $search: search };

    // Category filter (accepts slug or ObjectId)
    if (category) {
      // Try to match by ObjectId first, then by slug via lookup
      filter.category = category;
    }

    // Region filter (matches the product origin)
    if (region) {
      const key = String(region).trim().toLowerCase();
      const pattern = REGION_PATTERNS[key] || escapeRegex(String(region).trim());
      if (pattern) filter.origin = { $regex: pattern, $options: 'i' };
    }

    // Price filter (checks at least one variant in range)
    if (minPrice || maxPrice) {
      filter['variants.price'] = {};
      if (minPrice) filter['variants.price'].$gte = Number(minPrice);
      if (maxPrice) filter['variants.price'].$lte = Number(maxPrice);
    }

    // In-stock filter
    if (inStock === 'true') {
      filter['variants.stock'] = { $gt: 0 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('artisan', 'name village')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    setPublicCache(res, 30, 120);
    res.json({
      products,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:slug
export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug')
      .populate('artisan', 'name village story photo');

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    setPublicCache(res, 30, 120);
    res.json(product);
  } catch (err) {
    next(err);
  }
};
