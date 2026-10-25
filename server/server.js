import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize } from './middlewares/sanitize.js';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { initFirebaseAdmin } from './utils/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

// Firebase Admin must be configured before the server starts.
// Fails fast with a readable error when credentials are missing.
try {
  initFirebaseAdmin();
} catch (err) {
  console.error(
    `Firebase Admin initialization failed: ${err.message}\n` +
      'Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to server/.env, then restart the server.'
  );
  process.exit(1);
}

connectDB();

const app = express();

// ── Security Middleware ──────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Static Assets (Local Uploads Fallback) ───
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
// (sanitize is applied after body parsers so req.body is already parsed)

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
