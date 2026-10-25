import { Router } from 'express';
import { getSettings } from '../controllers/settingsController.js';

const router = Router();

// Public read-only settings for the storefront.
router.get('/', getSettings);

export default router;
