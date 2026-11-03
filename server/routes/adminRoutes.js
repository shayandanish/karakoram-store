import { Router } from 'express';
import { protect, adminOnly } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';
import {
  adminGetProducts, adminGetProductById,
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminBulkUpdateProducts,
  adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
  adminGetArtisans, adminCreateArtisan, adminUpdateArtisan, adminDeleteArtisan,
  adminGetCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon,
  adminGetOrders, adminGetOrderById, adminUpdateOrder, adminResendNotification, adminDeleteOrder,
  adminGetUsers, adminDeleteUser, adminVerifyUser,
  adminGetStats,
} from '../controllers/adminController.js';
import {
  adminGetCities, adminCreateCity, adminUpdateCity, adminDeleteCity,
} from '../controllers/cityController.js';
import { adminUpdateSettings } from '../controllers/settingsController.js';
import {
  adminGetSuppliers, adminCreateSupplier, adminUpdateSupplier,
  adminGetPurchases, adminCreatePurchase, adminReversePurchase,
  adminAddSupplierPayment, adminReverseSupplierPayment,
  adminGetExpenses, adminCreateExpense, adminReverseExpense,
  adminGetAccountReport, adminExportAccountReport, adminGetAccountAudit,
} from '../controllers/accountsController.js';
import { accountsExportLimiter, accountsLimiter } from '../utils/rateLimiters.js';
import { requireTrustedAccountsOrigin } from '../middlewares/accountsSecurity.js';

const router = Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.use('/accounts', requireTrustedAccountsOrigin, accountsLimiter, (req, res, next) => {
  res.set({
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
  });
  next();
});

router.get('/accounts/report.xlsx', accountsExportLimiter, adminExportAccountReport);
router.get('/accounts/report', adminGetAccountReport);
router.get('/accounts/audit', adminGetAccountAudit);
router.get('/accounts/suppliers', adminGetSuppliers);
router.post('/accounts/suppliers', adminCreateSupplier);
router.put('/accounts/suppliers/:id', adminUpdateSupplier);
router.get('/accounts/purchases', adminGetPurchases);
router.post('/accounts/purchases', adminCreatePurchase);
router.post('/accounts/purchases/:id/reverse', adminReversePurchase);
router.post('/accounts/purchases/:id/payments', adminAddSupplierPayment);
router.post('/accounts/payments/:id/reverse', adminReverseSupplierPayment);
router.get('/accounts/expenses', adminGetExpenses);
router.post('/accounts/expenses', adminCreateExpense);
router.post('/accounts/expenses/:id/reverse', adminReverseExpense);

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
router.post('/products/bulk-update', adminBulkUpdateProducts);

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

// Orders & Shipment Logistics
router.get('/orders', adminGetOrders);
router.get('/orders/:id', adminGetOrderById);
router.put('/orders/:id', adminUpdateOrder);
router.post('/orders/:id/resend-notification', adminResendNotification);
router.delete('/orders/:id', adminDeleteOrder);

// Users
router.get('/users', adminGetUsers);
router.post('/users/:id/verify', adminVerifyUser);
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
