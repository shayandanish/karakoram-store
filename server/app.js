import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { sanitize } from './middlewares/sanitize.js';
import { csrfProtection } from './middlewares/csrf.js';
import { apiLimiter, orderTrackLimiter, paymentUploadLimiter, checkoutLimiter } from './utils/rateLimiters.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { initCache, isCacheRedis } from './utils/cache.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Initialize cache (Redis + in-memory fallback) ───────────────────────
initCache();

// Vercel terminates TLS at its proxy, so Express must trust the forwarded protocol.
app.set('trust proxy', 1);

// ── Compression (gzip/brotli) — reduces response size, lowers latency ────
app.use(compression({ threshold: 1024 }));

// ── Response time header — helps monitor latency ─────────────────────────
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('headers', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    res.set('X-Response-Time', `${ms.toFixed(2)}ms`);
  });
  next();
});

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

// ── Rate Limiting ────────────────────────────
app.use(['/api', '/app'], apiLimiter);

// ── Body / Cookie Parsers ────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitize); // strip $-prefixed / dot-containing keys from body, params, query

// ── CSRF Protection ──────────────────────────
const isPublicStateChanging = (req) => {
  const path = req.path;
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isStateChanging) return false;
  if (path.includes('/auth/') || path.includes('/otp/')) return true;
  if (path.includes('/orders/track')) return true;
  if (path === '/orders' || path === '/app/orders') return true;
  if (path.includes('/orders/') && path.includes('/payment-screenshot')) return true;
  return false;
};

app.use(csrfProtection({ skip: isPublicStateChanging }));

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
    cache: isCacheRedis() ? 'redis' : 'memory',
  });
});

app.get(['/api/health', '/app/health'], (req, res) => {
  res.json({ status: 'success', message: 'Karakoram Store API is running' });
});

// ── API Routes (Support both /api and /app) ──
for (const prefix of ['/api', '/app']) {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/otp`, otpRoutes);
  app.use(`${prefix}/products/:slug/reviews`, reviewRoutes);
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
