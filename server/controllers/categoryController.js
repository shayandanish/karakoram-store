import Category from '../models/Category.js';
import { setPublicCache } from '../utils/cache.js';

// GET /api/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ order: 1, name: 1 });
    setPublicCache(res, 300, 600);
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// GET /api/categories/:slug
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) {
      res.status(404);
      throw new Error('Category not found');
    }
    setPublicCache(res, 300, 600);
    res.json(category);
  } catch (err) {
    next(err);
  }
};
