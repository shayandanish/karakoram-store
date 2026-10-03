import { Router } from 'express';
import { createOrder, getMyOrders, trackOrder } from '../controllers/orderController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// Guest or logged-in checkout
router.post('/', createOrder);

// Track by orderId + phone (no auth needed)
router.get('/track', trackOrder);

// Logged-in user's own orders
router.get('/my', protect, getMyOrders);

export default router;
