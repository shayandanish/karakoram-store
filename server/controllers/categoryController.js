import Category from '../models/Category.js';

// GET /api/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort('name');
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
    res.json(category);
  } catch (err) {
    next(err);
  }
};
