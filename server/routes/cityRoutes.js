import { Router } from 'express';
import { getCities, getCityBySlug } from '../controllers/cityController.js';

const router = Router();

router.get('/', getCities);
router.get('/:slug', getCityBySlug);

export default router;
