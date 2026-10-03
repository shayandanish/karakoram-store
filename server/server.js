import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sanitize } from './middlewares/sanitize.js';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

connectDB();

const app = express();

// ── Security Middleware ──────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// ── Error Handling ───────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
