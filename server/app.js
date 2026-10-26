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

const defaultOrigins = ['https://karakoram-store.vercel.app'];

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const localhostPattern = /^http:\/\/localhost:\d+$/;
const vercelPreviewPattern = /^https:\/\/karakoram-store[\w-]*\.vercel\.app$/;

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin?.replace(/\/+$/, '');
    if (
      !origin ||
      allowedOrigins.includes(normalizedOrigin) ||
      localhostPattern.test(origin) ||
      vercelPreviewPattern.test(origin)
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
app.use(['/api', '/app'], limiter);

// ── Body / Cookie Parsers ────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitize); // strip $-prefixed / dot-containing keys from body, params, query

// ── Health & Welcome Routes ───────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Welcome to Karakoram Store API',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      categories: '/api/categories',
    },
  });
});

app.get(['/api/health', '/app/health'], (req, res) => {
  res.json({ status: 'success', message: 'Karakoram Store API is running' });
});

// ── API Routes (Support both /api and /app) ──
for (const prefix of ['/api', '/app']) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/otp`, otpRoutes);
  app.use(`${prefix}/products`, productRoutes);
  app.use(`${prefix}/categories`, categoryRoutes);
  app.use(`${prefix}/orders`, orderRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/cities`, cityRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
}

// ── Error Handling ───────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
