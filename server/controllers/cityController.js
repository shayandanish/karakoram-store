import { z } from 'zod';
import City from '../models/City.js';
import cloudinary from '../config/cloudinary.js';
import { setPublicCache } from '../utils/cache.js';

/* ── Preprocessors & Normalizers ────────────────────────────── */
const normalizeImage = (val) => {
  if (!val) return { url: '', publicId: '' };
  if (typeof val === 'string') return { url: val.trim(), publicId: '' };
  if (typeof val === 'object') {
    return {
      url: typeof val.url === 'string' ? val.url.trim() : '',
      publicId: typeof val.publicId === 'string' ? val.publicId.trim() : '',
    };
  }
  return { url: '', publicId: '' };
};

const normalizeOrder = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Math.round(Number(val));
  return isNaN(num) || num < 0 ? 0 : num;
};

/* ── Validation schema ─────────────────────────────────────── */
const citySchema = z.object({
  name:        z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug:        z.string().trim().toLowerCase().min(2, 'Slug must be at least 2 characters')
                 .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  tagline:     z.string().nullish().transform((v) => (v ? v.trim() : '')),
  body:        z.string().trim().min(10, 'Body must be at least 10 characters'),
  image:       z.preprocess(normalizeImage, z.object({
                 url:      z.string().default(''),
                 publicId: z.string().default(''),
               })).optional().default({ url: '', publicId: '' }),
  accentColor: z.string().nullish().transform((v) => (v && v.trim() ? v.trim() : '#f89535')),
  gradient:    z.string().optional().default('from-mountain-900 via-mountain-800 to-mountain-700'),
  order:       z.preprocess(normalizeOrder, z.number().int().min(0)).default(0),
  isActive:    z.preprocess((v) => (v === undefined ? true : Boolean(v)), z.boolean()).default(true),
});

/* ── PUBLIC — GET /api/cities ──────────────────────────────── */
export const getCities = async (req, res, next) => {
  try {
    const cities = await City.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    setPublicCache(res, 60, 300);
    res.json({ cities });
  } catch (err) {
    next(err);
  }
};

/* ── PUBLIC — GET /api/cities/:slug ────────────────────────── */
export const getCityBySlug = async (req, res, next) => {
  try {
    const city = await City.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!city) {
      res.status(404);
      throw new Error('City not found');
    }
    setPublicCache(res, 300, 600);
    res.json({ city });
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — GET /api/admin/cities ─────────────────────────── */
export const adminGetCities = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name:    { $regex: q, $options: 'i' } },
        { tagline: { $regex: q, $options: 'i' } },
        { body:    { $regex: q, $options: 'i' } },
        { slug:    { $regex: q, $options: 'i' } },
      ];
    }
    const cities = await City.find(filter).sort({ order: 1, createdAt: 1 }).lean();
    res.json({ cities });
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — POST /api/admin/cities ────────────────────────── */
export const adminCreateCity = async (req, res, next) => {
  try {
    res.status(400); // default to 400 if validation or duplicate checks fail
    const data = citySchema.parse(req.body);

    // Check for duplicate slug
    const existing = await City.findOne({ slug: data.slug });
    if (existing) {
      throw new Error(`A city with slug "${data.slug}" already exists. Please choose a different slug.`);
    }

    const city = await City.create(data);
    res.status(201).json({ city });
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — PUT /api/admin/cities/:id ─────────────────────── */
export const adminUpdateCity = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      res.status(404);
      throw new Error('City not found');
    }

    res.status(400);
    // Strip MongoDB internal fields
    const { _id, __v, createdAt, updatedAt, ...cleanBody } = req.body;
    const data = citySchema.partial().parse(cleanBody);

    // If slug is provided and changed, ensure uniqueness
    if (data.slug && data.slug !== city.slug) {
      const conflict = await City.findOne({ slug: data.slug, _id: { $ne: city._id } });
      if (conflict) {
        throw new Error(`Slug "${data.slug}" is already taken by another city.`);
      }
    }

    Object.assign(city, data);
    await city.save();

    res.status(200).json({ city });
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — DELETE /api/admin/cities/:id ──────────────────── */
export const adminDeleteCity = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      res.status(404);
      throw new Error('City not found');
    }

    // Remove image from Cloudinary if it has one
    if (city.image?.publicId) {
      await cloudinary.uploader.destroy(city.image.publicId).catch(() => {});
    }

    await city.deleteOne();
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    next(err);
  }
};
