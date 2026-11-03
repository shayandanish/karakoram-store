import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { setPublicCache } from '../utils/cache.js';
import { getCache, setCache } from '../utils/cache.js';

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

// Cache TTLs (seconds)
const PRODUCT_LIST_TTL = 60;      // product listings change infrequently
const PRODUCT_DETAIL_TTL = 300;   // product detail pages are stable

// Build a stable cache key from query params
const makeListCacheKey = (q) => {
  const {
    search, category, region, minPrice, maxPrice, inStock, sale,
    sort, page, limit,
  } = q;
  return `products:list:${search}|${category}|${region}|${minPrice}|${maxPrice}|${inStock}|${sale}|${sort}|${page}|${limit}`;
};

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
      sale,
      sort = '-createdAt',
      page = 1,
      limit = 12,
    } = req.query;

    const cacheKey = makeListCacheKey(req.query);

    // 1. Check cache first (low latency path)
    const cached = await getCache(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      setPublicCache(res, PRODUCT_LIST_TTL, 120);
      return res.json(cached);
    }

    const filter = { isActive: true };

    // Full-text search
    if (search) filter.$text = { $search: search };

    // Category filter (accepts slug or ObjectId)
    if (category) {
      filter.category = category;
    }

    // Region filter (matches the product origin)
    if (region) {
      const key = String(region).trim().toLowerCase();
      const pattern = REGION_PATTERNS[key] || escapeRegex(String(region).trim());
      if (pattern) filter.origin = { $regex: pattern, $options: 'i' };
    }

    // Price filter — compares against each product's cheapest variant so the
    // range matches the "From Rs …" price shown on product cards.
    const exprClauses = [];

    if (minPrice || maxPrice) {
      const cheapestVariantPrice = { $min: '$variants.price' };
      if (minPrice) exprClauses.push({ $gte: [cheapestVariantPrice, Number(minPrice)] });
      if (maxPrice) exprClauses.push({ $lte: [cheapestVariantPrice, Number(maxPrice)] });
    }

    // In-stock filter
    if (inStock === 'true') {
      filter['variants.stock'] = { $gt: 0 };
    }

    // Sale filter (at least one variant with an active discount)
    if (sale === 'true') {
      exprClauses.push({
        $or: [
          // Any variant has discountPercent > 0
          { $gt: [{ $max: '$variants.discountPercent' }, 0] },
          // Any variant has compareAtPrice > price
          {
            $gt: [
              {
                $max: {
                  $map: {
                    input: '$variants',
                    as: 'v',
                    in: {
                      $subtract: [
                        { $ifNull: ['$$v.compareAtPrice', 0] },
                        { $ifNull: ['$$v.price', 0] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        ],
      });
    }

    if (exprClauses.length === 1) filter.$expr = exprClauses[0];
    else if (exprClauses.length > 1) filter.$expr = { $and: exprClauses };

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

    const result = {
      products,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      total,
    };

    // 2. Write to cache for next request (fire-and-forget, don't await)
    setCache(cacheKey, result, PRODUCT_LIST_TTL).catch(() => { });

    res.set('X-Cache', 'MISS');
    setPublicCache(res, PRODUCT_LIST_TTL, 120);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:slug
export const getProductBySlug = async (req, res, next) => {
  try {
    const slug = req.params.slug;
    const cacheKey = `products:detail:${slug}`;

    // 1. Check cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      setPublicCache(res, PRODUCT_DETAIL_TTL, 600);
      return res.json(cached);
    }

    const query = mongoose.isValidObjectId(slug)
      ? { $or: [{ _id: slug }, { slug }], isActive: true }
      : { slug, isActive: true };

    const product = await Product.findOne(query)
      .populate('category', 'name slug')
      .populate('artisan', 'name village story photo');

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // 2. Write to cache (fire-and-forget)
    setCache(cacheKey, product.toObject ? product.toObject() : product, PRODUCT_DETAIL_TTL).catch(() => { });

    res.set('X-Cache', 'MISS');
    setPublicCache(res, PRODUCT_DETAIL_TTL, 600);
    res.json(product);
  } catch (err) {
    next(err);
  }
};
