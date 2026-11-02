import { Router } from 'express';
import { getProductReviews, createReview } from '../controllers/reviewController.js';
import { protect } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });

router.get('/', getProductReviews);
router.post('/', protect, createReview);

export default router;
