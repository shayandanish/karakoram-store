import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';
import {
  adminGetProducts, adminGetProductById,
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetArtisans, adminCreateArtisan, adminUpdateArtisan, adminDeleteArtisan,
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon,
  adminGetOrders, adminUpdateOrder, adminDeleteOrder,
  adminGetUsers, adminDeleteUser,
  adminGetStats,
} from '../controllers/adminController.js';
import {
  adminGetCities, adminCreateCity, adminUpdateCity, adminDeleteCity,
} from '../controllers/cityController.js';
import { adminUpdateSettings } from '../controllers/settingsController.js';

const router = Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard stats
router.get('/stats', adminGetStats);

// Site settings / branding
router.put('/settings', adminUpdateSettings);

// Products
router.get('/products', adminGetProducts);
router.get('/products/:id', adminGetProductById);
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
router.delete('/orders/:id', adminDeleteOrder);

// Users
router.get('/users', adminGetUsers);
router.delete('/users/:id', adminDeleteUser);

// Media upload (admin only — front-end uploads go here first)
router.post('/upload', upload.single('image'), uploadImage);
router.delete('/upload', deleteImage);

// Cities / Regions
router.get('/cities', adminGetCities);
router.post('/cities', adminCreateCity);
router.put('/cities/:id', adminUpdateCity);
router.delete('/cities/:id', adminDeleteCity);

export default router;
