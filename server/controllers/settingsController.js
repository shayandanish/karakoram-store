import { z } from 'zod';
import SiteSettings from '../models/SiteSettings.js';
import { deleteStoredImage } from './uploadController.js';
import { setPublicCache } from '../utils/cache.js';

const DEFAULT_LOGO_ALT = 'Karakoram Store';

const logoSchema = z.object({
  url: z.string().trim().max(2048).optional().default(''),
  publicId: z.string().trim().max(512).optional().default(''),
  alt: z.string().trim().max(160).optional().default(DEFAULT_LOGO_ALT),
});

const settingsSchema = z.object({
  logo: logoSchema,
});

const serializeSettings = (settings) => ({
  logo: {
    url: settings.logo?.url || '',
    publicId: settings.logo?.publicId || '',
    alt: settings.logo?.alt || DEFAULT_LOGO_ALT,
  },
});

/* ── PUBLIC — GET /api/settings ─────────────────────────────── */
export const getSettings = async (req, res, next) => {
  try {
    // Branding can change at runtime, so keep the edge cache very short while
    // still letting repeat page loads reuse the tiny JSON response.
    setPublicCache(res, 10, 60);

    const settings = await SiteSettings.getSingleton();
    res.json(serializeSettings(settings));
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — PUT /api/admin/settings ───────────────────────── */
export const adminUpdateSettings = async (req, res, next) => {
  try {
    res.status(400);
    const data = settingsSchema.parse(req.body);

    // An empty URL means the logo has been removed, so drop the old publicId too.
    if (!data.logo.url) data.logo.publicId = '';

    const settings = await SiteSettings.getSingleton();
    const previousPublicId = settings.logo?.publicId || '';

    settings.logo = data.logo;
    await settings.save();

    // Clean up the replaced image after the new logo has been saved successfully.
    if (previousPublicId && previousPublicId !== data.logo.publicId) {
      await deleteStoredImage(previousPublicId);
    }

    res.status(200).json(serializeSettings(settings));
  } catch (err) {
    next(err);
  }
};
