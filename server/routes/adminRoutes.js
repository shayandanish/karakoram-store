import { Router } from 'express';
import { protect, adminOnly, adminStaffOnly, requireAdminPermission, requireAnyAdminPermission } from '../middlewares/auth.js';
import upload from '../middlewares/upload.js';
import { adminAudit } from '../middlewares/adminAudit.js';
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
import { adminGetActivity } from '../controllers/adminAuditController.js';
import { adminGetContactMessages, adminUpdateContactMessage, adminReplyToContactMessage } from '../controllers/contactMessageController.js';
import { adminGetStaff, adminCreateStaff, adminSetStaffStatus, adminSetStaffRole, adminResetStaffPassword } from '../controllers/adminStaffController.js';
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
router.use(protect, adminStaffOnly);
router.use(adminAudit);

router.use('/accounts', requireTrustedAccountsOrigin, accountsLimiter, (req, res, next) => {
  res.set({
    'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
    Pragma: 'no-cache',
  });
  next();
});
router.use('/accounts', requireAdminPermission('accounts'));

router.get('/accounts/report.xlsx', accountsExportLimiter, requireAdminPermission('accounts'), adminExportAccountReport);
router.get('/accounts/report', requireAdminPermission('accounts'), adminGetAccountReport);
router.get('/accounts/audit', requireAdminPermission('accounts'), adminGetAccountAudit);
router.get('/accounts/suppliers', requireAdminPermission('accounts'), adminGetSuppliers);
router.post('/accounts/suppliers', requireAdminPermission('accounts'), adminCreateSupplier);
router.put('/accounts/suppliers/:id', requireAdminPermission('accounts'), adminUpdateSupplier);
router.get('/accounts/purchases', requireAdminPermission('accounts'), adminGetPurchases);
router.post('/accounts/purchases', requireAdminPermission('accounts'), adminCreatePurchase);
router.post('/accounts/purchases/:id/reverse', requireAdminPermission('accounts'), adminReversePurchase);
router.post('/accounts/purchases/:id/payments', requireAdminPermission('accounts'), adminAddSupplierPayment);
router.post('/accounts/payments/:id/reverse', requireAdminPermission('accounts'), adminReverseSupplierPayment);
router.get('/accounts/expenses', requireAdminPermission('accounts'), adminGetExpenses);
router.post('/accounts/expenses', requireAdminPermission('accounts'), adminCreateExpense);
router.post('/accounts/expenses/:id/reverse', requireAdminPermission('accounts'), adminReverseExpense);

// Dashboard stats
router.get('/stats', requireAdminPermission('dashboard'), adminGetStats);
router.get('/audit', adminOnly, adminGetActivity);
router.get('/staff', adminOnly, adminGetStaff);
router.post('/staff', adminOnly, adminCreateStaff);
router.patch('/staff/:id/status', adminOnly, adminSetStaffStatus);
router.patch('/staff/:id/role', adminOnly, adminSetStaffRole);
router.put('/staff/:id/password', adminOnly, adminResetStaffPassword);

// Site settings / branding
router.put('/settings', requireAdminPermission('content'), adminUpdateSettings);
router.get('/contact-messages', requireAdminPermission('content'), adminGetContactMessages);
router.patch('/contact-messages/:id', requireAdminPermission('content'), adminUpdateContactMessage);
router.post('/contact-messages/:id/replies', requireAdminPermission('content'), adminReplyToContactMessage);

// Products
router.get('/products', requireAdminPermission('catalog'), adminGetProducts);
router.get('/products/:id', requireAdminPermission('catalog'), adminGetProductById);
router.post('/products', requireAdminPermission('catalog'), adminCreateProduct);
router.put('/products/:id', requireAdminPermission('catalog'), adminUpdateProduct);
router.delete('/products/:id', requireAdminPermission('catalog'), adminDeleteProduct);
router.post('/products/bulk-update', requireAdminPermission('catalog'), adminBulkUpdateProducts);

// Categories
router.post('/categories', requireAdminPermission('catalog'), adminCreateCategory);
router.put('/categories/:id', requireAdminPermission('catalog'), adminUpdateCategory);
router.delete('/categories/:id', requireAdminPermission('catalog'), adminDeleteCategory);

// Artisans
router.get('/artisans', requireAdminPermission('catalog'), adminGetArtisans);
router.post('/artisans', requireAdminPermission('catalog'), adminCreateArtisan);
router.put('/artisans/:id', requireAdminPermission('catalog'), adminUpdateArtisan);
router.delete('/artisans/:id', requireAdminPermission('catalog'), adminDeleteArtisan);

// Coupons
router.get('/coupons', requireAdminPermission('catalog'), adminGetCoupons);
router.post('/coupons', requireAdminPermission('catalog'), adminCreateCoupon);
router.put('/coupons/:id', requireAdminPermission('catalog'), adminUpdateCoupon);
router.delete('/coupons/:id', requireAdminPermission('catalog'), adminDeleteCoupon);

// Orders & Shipment Logistics
router.get('/orders', requireAdminPermission('orders'), adminGetOrders);
router.get('/orders/:id', requireAdminPermission('orders'), adminGetOrderById);
router.put('/orders/:id', requireAdminPermission('orders'), adminUpdateOrder);
router.post('/orders/:id/resend-notification', requireAdminPermission('orders'), adminResendNotification);
router.delete('/orders/:id', requireAdminPermission('orders'), adminDeleteOrder);

// Users
router.get('/users', adminOnly, adminGetUsers);
router.post('/users/:id/verify', adminOnly, adminVerifyUser);
router.delete('/users/:id', adminOnly, adminDeleteUser);

// Media upload (admin only — front-end uploads go here first)
router.post('/upload', requireAnyAdminPermission('catalog', 'content'), upload.single('image'), uploadImage);
router.delete('/upload', requireAdminPermission('catalog'), deleteImage);

// Cities / Regions
router.get('/cities', requireAdminPermission('catalog'), adminGetCities);
router.post('/cities', requireAdminPermission('catalog'), adminCreateCity);
router.put('/cities/:id', requireAdminPermission('catalog'), adminUpdateCity);
router.delete('/cities/:id', requireAdminPermission('catalog'), adminDeleteCity);

export default router;
