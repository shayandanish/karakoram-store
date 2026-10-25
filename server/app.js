import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { sanitize } from './middlewares/sanitize.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Vercel terminates TLS at its proxy, so Express must trust the forwarded protocol.
app.set('trust proxy', 1);

// ── Security Middleware ──────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Static Assets (Local Uploads Fallback) ───
// On Vercel, uploads are stored in Cloudinary instead of this folder.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const localhostPattern = /^http:\/\/localhost:\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/+$/, '');
    if (
      !origin ||
      allowedOrigins.includes(normalizedOrigin) ||
      localhostPattern.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
});
app.use('/api', limiter);

// ── Body / Cookie Parsers ────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitize); // strip $-prefixed / dot-containing keys from body, params, query

// ── Health Check ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'Karakoram Store API is running' });
});

// ── API Routes ───────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/settings', settingsRoutes);

// ── Error Handling ───────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
