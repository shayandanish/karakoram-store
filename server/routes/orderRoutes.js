import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  trackOrder,
  getOrderById,
  uploadPaymentScreenshot,
} from '../controllers/orderController.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { orderTrackLimiter, paymentUploadLimiter, checkoutLimiter } from '../utils/rateLimiters.js';

const router = Router();

// Guest or logged-in checkout (optionalAuth populates req.user if logged in)
router.post('/', checkoutLimiter, optionalAuth, createOrder);

// Track by orderId + phone / email (no auth required) — stricter limit (enumeration vector)
router.get('/track', orderTrackLimiter, optionalAuth, trackOrder);

// Upload payment proof screenshot (supports guest with phone/email verification or logged-in) — stricter limit
router.post('/:id/payment-screenshot', paymentUploadLimiter, optionalAuth, upload.single('screenshot'), uploadPaymentScreenshot);

// Logged-in user's own orders
router.get('/my', protect, getMyOrders);

// Single order details (owner or admin, or public with check)
router.get('/:id', optionalAuth, getOrderById);

export default router;
