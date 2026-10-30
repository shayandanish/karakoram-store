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

const router = Router();

// Guest or logged-in checkout (optionalAuth populates req.user if logged in)
router.post('/', optionalAuth, createOrder);

// Track by orderId + phone / email (no auth required)
router.get('/track', optionalAuth, trackOrder);

// Upload payment proof screenshot (supports guest with phone/email verification or logged-in)
router.post('/:id/payment-screenshot', optionalAuth, upload.single('screenshot'), uploadPaymentScreenshot);

// Logged-in user's own orders
router.get('/my', protect, getMyOrders);

// Single order details (owner or admin, or public with check)
router.get('/:id', optionalAuth, getOrderById);

export default router;
