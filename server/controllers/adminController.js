import { z } from 'zod';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Artisan from '../models/Artisan.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import cloudinary from '../config/cloudinary.js';
import { deleteFirebaseUser, getFirebaseAuth } from '../utils/firebaseAdmin.js';
import { dispatchOrderNotifications } from '../utils/notificationService.js';

/* ─────────────────────────────────────────────
   PRODUCTS
───────────────────────────────────────────── */

const variantSchema = z.object({
  label: z.string().min(1),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  discountPercent: z.number().min(0).max(99).nullable().optional(),
  compareAtPrice: z.number().nullable().optional(),
  discountLabel: z.string().optional().default(''),
});

const imageSchema = z.object({
  url: z.string(),
  publicId: z.string(),
  alt: z.string().optional().default(''),
});

const videoSchema = z.object({
  url: z.string().optional().default(''),
  publicId: z.string().optional().default(''),
});

const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  shortDescription: z.string().optional().default(''),
  category: z.string().length(24),
  artisan: z.string().length(24).nullable().optional(),
  origin: z.string().optional().default('Hunza, Gilgit-Baltistan'),
  isSeasonal: z.boolean().optional().default(false),
  variants: z.array(variantSchema).min(1),
  images: z.array(imageSchema).optional().default([]),
  video: videoSchema.optional(),
  tags: z.array(z.string()).optional().default([]),
  region: z.string().optional().default('Hunza'),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  seoTitle: z.string().optional().default(''),
  seoDescription: z.string().optional().default(''),
});

export const adminGetProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .populate('artisan', 'name village')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ products, page: Number(page), pages: Math.ceil(total / Number(limit)), total });
  } catch (err) { next(err); }
};

export const adminGetProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('artisan', 'name village');
    if (!product) { res.status(404); throw new Error('Product not found'); }
    res.json(product);
  } catch (err) { next(err); }
};

export const adminCreateProduct = async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) { next(err); }
};

export const adminUpdateProduct = async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) { res.status(404); throw new Error('Product not found'); }
    res.json(product);
  } catch (err) { next(err); }
};

export const adminDeleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404); throw new Error('Product not found'); }

    // Delete associated Cloudinary images
    if (product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
      }
    }
    if (product.video?.publicId) await cloudinary.uploader.destroy(product.video.publicId, { resource_type: 'video' });

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   CATEGORIES
───────────────────────────────────────────── */

const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  group: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
  image: z.object({ url: z.string(), publicId: z.string() }).optional(),
});

export const adminCreateCategory = async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await Category.create(data);
    res.status(201).json(category);
  } catch (err) { next(err); }
};

export const adminUpdateCategory = async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) { res.status(404); throw new Error('Category not found'); }
    res.json(category);
  } catch (err) { next(err); }
};

export const adminDeleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) { res.status(404); throw new Error('Category not found'); }
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   ARTISANS
───────────────────────────────────────────── */

const artisanSchema = z.object({
  name: z.string().min(2),
  village: z.string().optional(),
  story: z.string().optional(),
  photo: z.object({ url: z.string(), publicId: z.string() }).optional(),
});

export const adminGetArtisans = async (req, res, next) => {
  try {
    const artisans = await Artisan.find().sort('name');
    res.json(artisans);
  } catch (err) { next(err); }
};

export const adminCreateArtisan = async (req, res, next) => {
  try {
    const data = artisanSchema.parse(req.body);
    const artisan = await Artisan.create(data);
    res.status(201).json(artisan);
  } catch (err) { next(err); }
};

export const adminUpdateArtisan = async (req, res, next) => {
  try {
    const data = artisanSchema.partial().parse(req.body);
    const artisan = await Artisan.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!artisan) { res.status(404); throw new Error('Artisan not found'); }
    res.json(artisan);
  } catch (err) { next(err); }
};

export const adminDeleteArtisan = async (req, res, next) => {
  try {
    const artisan = await Artisan.findByIdAndDelete(req.params.id);
    if (!artisan) { res.status(404); throw new Error('Artisan not found'); }
    res.json({ message: 'Artisan deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   COUPONS
───────────────────────────────────────────── */

const couponSchema = z.object({
  code: z.string().min(3).max(20),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minOrderAmount: z.number().min(0).optional(),
  expiry: z.string().datetime(),
  usageLimit: z.number().int().min(1),
});

export const adminGetCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    res.json(coupons);
  } catch (err) { next(err); }
};

export const adminCreateCoupon = async (req, res, next) => {
  try {
    const data = couponSchema.parse(req.body);
    const coupon = await Coupon.create(data);
    res.status(201).json(coupon);
  } catch (err) { next(err); }
};

export const adminUpdateCoupon = async (req, res, next) => {
  try {
    const data = couponSchema.partial().parse(req.body);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
    res.json(coupon);
  } catch (err) { next(err); }
};

export const adminDeleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
    res.json({ message: 'Coupon deleted' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   ORDERS
───────────────────────────────────────────── */

export const adminGetOrders = async (req, res, next) => {
  try {
    const {
      status,
      payment,
      paymentStatus,
      search,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    // Status filter (support 9 statuses or 'all')
    const activeStatus = status && status !== 'all' ? status : null;
    if (activeStatus) {
      filter.orderStatus = activeStatus;
    }

    // Payment status filter
    const activePayment = payment || paymentStatus;
    if (activePayment && activePayment !== 'all') {
      filter.paymentStatus = activePayment;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Comprehensive text search (Order ID, names, phone, email, tracking CN)
    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions = [
        { orderId: { $regex: q, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: q, $options: 'i' } },
        { 'shippingAddress.name': { $regex: q, $options: 'i' } },
        { guestPhone: { $regex: q, $options: 'i' } },
        { guestName: { $regex: q, $options: 'i' } },
        { guestEmail: { $regex: q, $options: 'i' } },
        { 'shipment.trackingId': { $regex: q, $options: 'i' } },
        { 'shipment.courierName': { $regex: q, $options: 'i' } },
      ];

      if (mongoose.isValidObjectId(q)) {
        searchConditions.push({ _id: q });
      }

      if (Object.keys(filter).length > 0) {
        filter.$and = [{ ...filter }, { $or: searchConditions }];
        // clear top-level filters that are now in $and
        delete filter.orderStatus;
        delete filter.paymentStatus;
        delete filter.createdAt;
      } else {
        filter.$or = searchConditions;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      page: Number(page),
      pages: Math.max(1, Math.ceil(total / Number(limit))),
      total,
    });
  } catch (err) { next(err); }
};

// GET /api/admin/orders/:id — single order full details
export const adminGetOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { orderId: id.toUpperCase() }] }
      : { orderId: id.toUpperCase() };

    const order = await Order.findOne(query).populate('user', 'name email');
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    res.json(order);
  } catch (err) { next(err); }
};

// PUT /api/admin/orders/:id — update status, shipment, notes
export const adminUpdateOrder = async (req, res, next) => {
  try {
    const updateSchema = z.object({
      orderStatus: z.enum([
        'pending',
        'confirmed',
        'processing',
        'packed',
        'shipped',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
      ]).optional(),
      paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
      shipment: z.object({
        courierName: z.string().optional().default(''),
        trackingId: z.string().optional().default(''),
        trackingUrl: z.string().optional().default(''),
        shippedAt: z.string().optional().nullable(),
        estimatedDelivery: z.string().optional().nullable(),
      }).optional(),
      adminNotes: z.string().optional(),
      notes: z.string().optional(),
      statusNote: z.string().optional(),
      notifyCustomer: z.boolean().optional().default(true),
    });

    const data = updateSchema.parse(req.body);

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const previousStatus = order.orderStatus;
    const previousTracking = order.shipment?.trackingId || '';

    // Handle status change
    let statusChanged = false;
    if (data.orderStatus && data.orderStatus !== previousStatus) {
      statusChanged = true;
      order.orderStatus = data.orderStatus;
      order.statusHistory.push({
        status: data.orderStatus,
        changedAt: new Date(),
        note: data.statusNote?.trim() || `Status updated from ${previousStatus} to ${data.orderStatus}`,
        changedBy: req.user?.name || 'Administrator',
      });
    }

    // Handle shipment details
    let shipmentChanged = false;
    if (data.shipment) {
      if (!order.shipment) order.shipment = {};
      if (data.shipment.courierName !== undefined) order.shipment.courierName = data.shipment.courierName;
      if (data.shipment.trackingId !== undefined) {
        if (data.shipment.trackingId !== previousTracking) shipmentChanged = true;
        order.shipment.trackingId = data.shipment.trackingId;
      }
      if (data.shipment.trackingUrl !== undefined) order.shipment.trackingUrl = data.shipment.trackingUrl;

      if (data.shipment.shippedAt) {
        order.shipment.shippedAt = new Date(data.shipment.shippedAt);
      } else if (order.orderStatus === 'shipped' && !order.shipment.shippedAt) {
        order.shipment.shippedAt = new Date();
      }

      if (data.shipment.estimatedDelivery) {
        order.shipment.estimatedDelivery = new Date(data.shipment.estimatedDelivery);
      }
    }

    // Handle payment status
    if (data.paymentStatus) {
      order.paymentStatus = data.paymentStatus;
    }

    // Handle notes
    if (data.adminNotes !== undefined) {
      order.adminNotes = data.adminNotes;
    }
    if (data.notes !== undefined) {
      order.notes = data.notes;
    }

    await order.save();

    // Customer Notification Trigger (awaited so serverless / Vercel sends before terminating)
    if (data.notifyCustomer) {
      try {
        if (statusChanged) {
          await dispatchOrderNotifications(order, order.orderStatus);
        } else if (shipmentChanged && order.orderStatus === 'shipped') {
          await dispatchOrderNotifications(order, 'shipment_updated');
        }
      } catch (err) {
        console.error(`[Admin notification error on ${order.orderStatus}]:`, err);
      }
    }

    res.json(order);
  } catch (err) { next(err); }
};

// POST /api/admin/orders/:id/resend-notification
export const adminResendNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { event, channel = 'all' } = req.body;

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    const targetEvent = event || order.orderStatus || 'order_placed';
    const result = await dispatchOrderNotifications(order, targetEvent, {
      force: true,
      channel,
    });

    res.json({ message: 'Notification dispatched successfully', result });
  } catch (err) { next(err); }
};

// DELETE /api/admin/orders/:id
export const adminDeleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error('Invalid order id');
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    await order.deleteOne();

    res.json({ message: 'Order deleted successfully' });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   STATS (sales dashboard)
───────────────────────────────────────────── */

export const adminGetStats = async (req, res, next) => {
  try {
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      pendingOrders,
      recentOrders,
      lowStockProducts,
      lowStockCount,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      Order.countDocuments({ orderStatus: 'pending' }),
      Order.find().sort('-createdAt').limit(5).populate('user', 'name email'),
      Product.find({ 'variants.stock': { $lt: 10 } })
        .populate('category', 'name slug')
        .select('name slug variants images category isActive')
        .limit(10),
      Product.countDocuments({ 'variants.stock': { $lt: 10 } }),
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers,
      pendingOrders,
      recentOrders,
      lowStockProducts,
      lowStockCount,
    });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────
   USERS
───────────────────────────────────────────── */

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/users?search=&page=1&limit=20
export const adminGetUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const filter = {};
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        // passwordHash is never selected, so it can never be returned
        .select('name email phone role status isVerified createdAt')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/verify
// Lets the admin activate a sign-up when the customer never managed to click
// the Firebase verification link (spam folder, blocked email, etc.).
export const adminVerifyUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error('Invalid user id');
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.firebaseUid) {
      try {
        await getFirebaseAuth().updateUser(user.firebaseUid, { emailVerified: true });
      } catch (fbErr) {
        if (fbErr.code === 'FIREBASE_NOT_CONFIGURED') {
          res.status(503);
          throw new Error(
            'Firebase Admin is not configured, so the linked Firebase account cannot be verified.'
          );
        }
        if (fbErr.code !== 'auth/user-not-found') {
          res.status(502);
          throw new Error(`Could not verify the linked Firebase account: ${fbErr.message}`);
        }
      }
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { status: 'verified', isVerified: true } },
      { new: true, runValidators: false }
    )
      .select('name email phone role status isVerified createdAt')
      .lean();

    res.json({ message: 'User verified', user: updated });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id
export const adminDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400);
      throw new Error('Invalid user id');
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Admins cannot delete themselves
    if (user._id.equals(req.user._id)) {
      res.status(400);
      throw new Error('You cannot delete your own account.');
    }

    // Never leave the system without an admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        res.status(400);
        throw new Error('The last admin account cannot be deleted.');
      }
    }

    // Keep Firebase in sync when the user is linked to a Firebase account
    if (user.firebaseUid) {
      try {
        await deleteFirebaseUser(user.firebaseUid);
      } catch (fbErr) {
        if (fbErr.code === 'FIREBASE_NOT_CONFIGURED') {
          res.status(503);
          throw new Error(
            'Firebase Admin is not configured, so the linked Firebase account cannot be deleted.'
          );
        }
        res.status(502);
        throw new Error(`Could not delete the linked Firebase account: ${fbErr.message}`);
      }
    }

    // Clean up all orders associated with this user
    const orderFilter = [{ user: user._id }];
    if (user.email) {
      orderFilter.push({ guestEmail: user.email.toLowerCase() });
    }
    await Order.deleteMany({ $or: orderFilter });

    // Clean up all reviews written by this user
    await Review.deleteMany({ user: user._id });

    await user.deleteOne();

    res.json({ message: 'User and all associated orders deleted successfully' });
  } catch (err) { next(err); }
};
