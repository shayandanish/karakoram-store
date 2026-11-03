import { Router } from 'express';
import { getProductReviews, createReview } from '../controllers/reviewController.js';
import { protect } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';

const router = Router({ mergeParams: true });

router.get('/', getProductReviews);
router.post('/', protect, upload.array('images', 3), createReview);

export default router;
