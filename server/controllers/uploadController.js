import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/** Check if valid Cloudinary credentials are set in .env */
const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return (
    Boolean(cloudName) &&
    cloudName !== 'your_cloud_name' &&
    Boolean(apiKey) &&
    apiKey !== 'your_api_key' &&
    Boolean(apiSecret) &&
    apiSecret !== 'your_api_secret'
  );
};

/** Stream a buffer to Cloudinary */
const streamUploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id, storage: 'cloudinary' });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });

/** Save a buffer to local disk (fallback when Cloudinary is not configured) */
const saveToLocalDisk = async (req, file, folder) => {
  const folderDir = path.join(UPLOADS_DIR, folder);
  await fs.promises.mkdir(folderDir, { recursive: true });

  const ext = path.extname(file.originalname) || (file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg');
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext.toLowerCase()}`;
  const filePath = path.join(folderDir, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  // Build full public URL
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  const url = `${protocol}://${host}/uploads/${folder}/${filename}`;

  return {
    url,
    publicId: `local_${folder}_${filename}`,
    storage: 'local',
  };
};

// POST /api/admin/upload — single image
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file provided');
    }

    const folder = req.query.folder ? req.query.folder.replace(/[^a-zA-Z0-9_-]/g, '') : 'karakoram-store';

    // Vercel has a read-only/ephemeral filesystem. Uploads must use Cloudinary there.
    if (process.env.VERCEL && !isCloudinaryConfigured()) {
      res.status(503);
      throw new Error(
        'Image uploads require Cloudinary on Vercel. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the project environment variables.'
      );
    }

    // 1. Try Cloudinary if configured
    if (isCloudinaryConfigured()) {
      try {
        const result = await streamUploadToCloudinary(req.file.buffer, folder);
        return res.status(201).json(result);
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed:', cloudErr.message);
        if (process.env.VERCEL) {
          res.status(502);
          throw new Error('Cloudinary upload failed. Please try again.');
        }
        // Local development fallback when Cloudinary is temporarily unavailable
        const localResult = await saveToLocalDisk(req, req.file, folder);
        return res.status(201).json(localResult);
      }
    }

    // 2. Cloudinary not configured — local development fallback
    const result = await saveToLocalDisk(req, req.file, folder);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

/** Delete a stored image by publicId. Safe to call when the file is already gone. */
export const deleteStoredImage = async (publicId) => {
  if (!publicId) return;

  // Local file deletion
  if (publicId.startsWith('local_')) {
    const parts = publicId.split('_');
    if (parts.length >= 3) {
      const folder = parts[1];
      const filename = parts.slice(2).join('_');
      const filePath = path.join(UPLOADS_DIR, folder, filename);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // ignore if already deleted
      }
    }
    return;
  }

  // Cloudinary deletion
  if (isCloudinaryConfigured()) {
    await cloudinary.uploader.destroy(publicId).catch(() => {});
  }
};

// DELETE /api/admin/upload — remove by publicId
export const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      res.status(400);
      throw new Error('publicId is required');
    }

    await deleteStoredImage(publicId);
    res.json({
      message: publicId.startsWith('local_')
        ? 'Image deleted from local storage'
        : 'Image deleted',
    });
  } catch (err) {
    next(err);
  }
};
