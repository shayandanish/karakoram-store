import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';
import {
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetArtisans, adminCreateArtisan, adminUpdateArtisan, adminDeleteArtisan,
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon,
  adminGetOrders, adminUpdateOrder,
  adminGetStats,
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard stats
router.get('/stats', adminGetStats);

// Products
router.post('/products', adminCreateProduct);
router.put('/products/:id', adminUpdateProduct);
router.delete('/products/:id', adminDeleteProduct);

// Categories
router.post('/categories', adminCreateCategory);
router.put('/categories/:id', adminUpdateCategory);
router.delete('/categories/:id', adminDeleteCategory);

// Artisans
router.get('/artisans', adminGetArtisans);
router.post('/artisans', adminCreateArtisan);
router.put('/artisans/:id', adminUpdateArtisan);
router.delete('/artisans/:id', adminDeleteArtisan);

// Coupons
router.get('/coupons', adminGetCoupons);
router.post('/coupons', adminCreateCoupon);
router.put('/coupons/:id', adminUpdateCoupon);
router.delete('/coupons/:id', adminDeleteCoupon);

// Orders
router.get('/orders', adminGetOrders);
router.put('/orders/:id', adminUpdateOrder);

// Media upload (admin only — front-end uploads go here first)
router.post('/upload', upload.single('image'), uploadImage);
router.delete('/upload', deleteImage);

export default router;
