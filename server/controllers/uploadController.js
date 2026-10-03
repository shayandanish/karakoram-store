import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

/** Stream a buffer to Cloudinary and return { url, publicId } */
const streamUpload = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });

// POST /api/upload — single image
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file provided');
    }

    const folder = req.query.folder || 'karakoram-store';
    const result = await streamUpload(req.file.buffer, folder);

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/upload — remove by publicId
export const deleteImage = async (req, res, next) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      res.status(400);
      throw new Error('publicId is required');
    }

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
};
