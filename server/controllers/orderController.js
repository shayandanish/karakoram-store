import mongoose from 'mongoose';
import { z } from 'zod';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import SiteSettings from '../models/SiteSettings.js';
import User from '../models/User.js';
import { hasAdminPermission } from '../middlewares/auth.js';
import { getEnabledPaymentMethod } from '../utils/paymentMethods.js';
import { generateOrderId } from '../utils/orderIdGenerator.js';
import { dispatchOrderNotifications } from '../utils/notificationService.js';
import { resolveDeliveryRate } from '../utils/deliveryRates.js';
import {
  isCloudinaryConfigured,
  streamUploadToCloudinary,
  saveToLocalDisk,
} from './uploadController.js';

// ── Known legitimate email domains ────────────────────────────────────────
const KNOWN_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'live.com', 'live.co.uk', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.com.pk',
  'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'zoho.com', 'zohomail.com',
  'fastmail.com', 'fastmail.fm',
  'tutanota.com', 'tutamail.com',
  'yandex.com', 'yandex.ru',
  'mail.com', 'email.com',
  'gmx.com', 'gmx.net', 'gmx.de',
  'aol.com',
]);

/**
 * Validate an email address — structural check + optional domain allowlist.
 * Returns true when email is valid or when domain is unknown-but-plausible
 * (we only hard-block structurally malformed addresses server-side).
 */
const isValidEmail = (email) => {
  if (!email) return true; // optional field
  const cleaned = String(email).trim().toLowerCase();
  // Must match basic RFC-5321 structure
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned)) return false;
  // Domain check: if in our known list → definitely valid.
  // If unknown domain → still allow (could be corporate/custom domain).
  return true;
};

/**
 * Stricter check used for guestEmail: known domains OR corporate TLDs.
 * Returns an error string or null.
 */
const checkEmailDomain = (email) => {
  if (!email) return null;
  const cleaned = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned)) {
    return 'Please enter a valid email address (e.g. name@gmail.com)';
  }
  const domain = cleaned.split('@')[1];
  // If domain ends with a known TLD and has reasonable length, accept it.
  // We only reject obviously fake patterns (single char domain, no dot, etc.)
  if (domain.length < 4 || !domain.includes('.')) {
    return 'Email domain looks invalid — please use a real email address';
  }
  return null;
};

/**
 * Normalizes phone number for strict comparison.
 * Extracts the last 10 digits (ignoring leading country code / 0) to ensure
 * exact match between 03XXXXXXXXX and +923XXXXXXXXX while rejecting loose endsWith matches.
 */
export const normalizePhoneForStrictMatch = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

export const addressSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .refine((val) => {
      const d = val.replace(/\D/g, '');
      // Pakistani local: 03XXXXXXXXX (11 digits)
      if (d.startsWith('03') && d.length === 11) return true;
      // Pakistani with country code: 923XXXXXXXXX (12 digits)
      if (d.startsWith('923') && d.length === 12) return true;
      // International E.164-like: starts with a non-zero digit, 7–15 total digits
      if (d.length >= 7 && d.length <= 15) return true;
      return false;
    }, 'Please enter a valid phone number (e.g. 0300 1234567 or +971 50 123 4567)'),
  street: z.string().min(3).max(200),
  city: z.string().min(2).max(100),
  province: z.string().min(2).max(100),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(50).default('Pakistan'),
});

export const orderItemInputSchema = z.object({
  product: z.string().length(24, 'Invalid product id'),
  variantLabel: z.string().min(1).max(50),
  quantity: z.number().int().min(1).max(50, 'Quantity cannot exceed 50 per item'),
});

export const createOrderSchema = z.object({
  // Guest fields (required when not logged in)
  guestName: z.string().max(100).optional(),
  guestEmail: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || checkEmailDomain(val) === null,
      (val) => ({ message: checkEmailDomain(val) || 'Invalid email address' })
    ),
  guestPhone: z.string().min(7, 'Phone number is too short').max(20).optional(),

  items: z.array(orderItemInputSchema).min(1).max(30, 'Cannot exceed 30 items per order'),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(['easypaisa', 'cod', 'COD', 'bank_transfer', 'jazzcash', 'other']).default('easypaisa'),
  transactionId: z.string().max(100).optional(),
  couponCode: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),

  // Communication & WhatsApp preferences
  whatsappConsent: z.boolean().optional().default(true),
  whatsappPhone: z.string().max(20).optional(),
});

// POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const siteSettings = await SiteSettings.getSingleton();
    const paymentMethod = getEnabledPaymentMethod(
      siteSettings,
      data.paymentMethod || 'easypaisa'
    );
    if (!paymentMethod) {
      res.status(400);
      throw new Error('The selected payment method is unavailable. Please choose another method.');
    }
    const deliveryRate = resolveDeliveryRate(siteSettings, data.shippingAddress);
    const { shippingCost } = deliveryRate;

    // Guest orders require contact details
    if (!req.user && (!data.guestName || !data.guestPhone)) {
      res.status(400);
      throw new Error('Guest name and phone are required for guest orders');
    }

    // Generate unique human-readable Order ID outside session to avoid upsert write conflict
    const customOrderId = await generateOrderId();

    let createdOrder = null;
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // Build order items by looking up server-side prices
        const orderItems = [];
        for (const input of data.items) {
          const product = await Product.findById(input.product)
            .select('+variants.averageCostMinor')
            .session(session);
          if (!product || !product.isActive) {
            throw new Error(`Product ${input.product} not found or inactive`);
          }

          const variant = product.variants.find((v) => v.label === input.variantLabel);
          if (!variant) {
            throw new Error(`Variant "${input.variantLabel}" not found for ${product.name}`);
          }
          if (variant.stock < input.quantity) {
            throw new Error(`Insufficient stock for ${product.name} (${input.variantLabel})`);
          }

          // Reduce stock atomically with guard against overselling / race conditions
          const stockUpdateResult = await Product.updateOne(
            {
              _id: product._id,
              variants: {
                $elemMatch: {
                  label: input.variantLabel,
                  stock: { $gte: input.quantity },
                },
              },
            },
            { $inc: { 'variants.$.stock': -input.quantity } },
            { session }
          );

          if (stockUpdateResult.modifiedCount === 0) {
            throw new Error(`Insufficient stock for ${product.name} (${input.variantLabel})`);
          }

          // Server-calculated effective price taking discount percentage into account
          let effectivePrice = variant.price;
          if (variant.discountPercent && variant.discountPercent > 0) {
            effectivePrice = Math.max(1, Math.round(variant.price * (1 - variant.discountPercent / 100)));
          } else if (variant.compareAtPrice && variant.compareAtPrice > variant.price) {
            effectivePrice = variant.price;
          }

          orderItems.push({
            product: product._id,
            name: product.name,
            variantLabel: input.variantLabel,
            price: effectivePrice, // server-calculated price
            unitCostMinor: Number.isSafeInteger(variant.averageCostMinor)
              ? variant.averageCostMinor
              : null,
            quantity: input.quantity,
            image: product.images?.[0]?.url || '',
          });
        }

        // Server-side totals
        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        let discount = 0;

        // Link order to logged-in user or find matching registered user by email
        let userId = req.user?._id || null;
        const cleanGuestEmail = data.guestEmail ? data.guestEmail.toLowerCase().trim() : '';

        if (!userId && cleanGuestEmail) {
          const matchedUser = await User.findOne({
            email: cleanGuestEmail,
          }).session(session);
          if (matchedUser) {
            userId = matchedUser._id;
          }
        }

        // Apply coupon if provided
        if (data.couponCode && data.couponCode.trim()) {
          const codeUpper = data.couponCode.trim().toUpperCase();
          const coupon = await Coupon.findOne({ code: codeUpper }).session(session);

          if (!coupon) {
            res.status(400);
            throw new Error(`Coupon "${codeUpper}" does not exist`);
          }
          if (!coupon.isActive) {
            res.status(400);
            throw new Error(`Coupon "${codeUpper}" is inactive`);
          }
          if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
            res.status(400);
            throw new Error(`Coupon "${codeUpper}" has expired`);
          }
          if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            res.status(400);
            throw new Error(`Coupon "${codeUpper}" has reached its maximum usage limit`);
          }
          if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
            res.status(400);
            throw new Error(`Order subtotal must be at least Rs ${coupon.minOrderAmount} to use coupon "${codeUpper}"`);
          }

          // Per-customer usage check
          const customerConditions = [];
          if (userId) customerConditions.push({ user: userId });
          if (cleanGuestEmail) customerConditions.push({ guestEmail: cleanGuestEmail });
          if (customerConditions.length > 0) {
            const customerUses = await Order.countDocuments({
              $or: customerConditions,
              couponCode: codeUpper,
              orderStatus: { $ne: 'cancelled' },
            }).session(session);

            const allowedLimit = coupon.perCustomerLimit || 1;
            if (customerUses >= allowedLimit) {
              res.status(400);
              throw new Error(`You have already redeemed coupon "${codeUpper}" the maximum allowed times (${allowedLimit})`);
            }
          }

          const rawDiscount =
            coupon.discountType === 'percentage'
              ? (subtotal * coupon.value) / 100
              : coupon.value;

          discount = Math.min(subtotal, Math.round(rawDiscount));

          // Increment usage count atomically
          await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });
        }

        const total = Math.max(0, subtotal + shippingCost - discount);

        const initialHistory = [
          {
            status: 'pending',
            changedAt: new Date(),
            note: 'Order placed by customer via website checkout.',
            changedBy: req.user?.name || data.guestName || 'Customer',
          },
        ];

        const [newOrder] = await Order.create(
          [
            {
              orderId: customOrderId,
              user: userId,
              guestName: data.guestName,
              guestEmail: cleanGuestEmail || undefined,
              guestPhone: data.guestPhone,
              items: orderItems,
              shippingAddress: data.shippingAddress,
              shippingZone: deliveryRate.zoneName,
              deliveryEstimate: {
                minDays: deliveryRate.minDays,
                maxDays: deliveryRate.maxDays,
                estimatedFrom: new Date(Date.now() + deliveryRate.minDays * 86400000),
                estimatedTo: new Date(Date.now() + deliveryRate.maxDays * 86400000),
              },
              paymentMethod: paymentMethod.id === 'cod' ? 'COD' : paymentMethod.id,
              paymentDetails: {
                name: paymentMethod.name,
                accountName: paymentMethod.accountName,
                accountNumber: paymentMethod.accountNumber,
                instructions: paymentMethod.instructions,
              },
              transactionId: data.transactionId || '',
              orderStatus: 'pending',
              statusHistory: initialHistory,
              couponCode: data.couponCode ? data.couponCode.trim().toUpperCase() : '',
              notes: data.notes || '',
              whatsappConsent: data.whatsappConsent !== false,
              whatsappPhone: data.whatsappPhone || data.shippingAddress.phone || data.guestPhone || '',
              subtotal,
              shippingCost,
              discount,
              total,
            },
          ],
          { session }
        );

        createdOrder = newOrder;
      });
    } finally {
      await session.endSession();
    }

    if (!createdOrder) {
      throw new Error('Could not complete order. Please try again.');
    }

    // Dispatch order confirmation email (awaited to ensure delivery in serverless/Vercel environments)
    try {
      await dispatchOrderNotifications(createdOrder, 'order_placed');
    } catch (notifyErr) {
      console.error('[Notification dispatch error on order_placed]:', notifyErr);
    }

    res.status(201).json(createdOrder);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/my — logged-in user's orders
export const getMyOrders = async (req, res, next) => {
  try {
    const userEmail = req.user?.email?.toLowerCase().trim();
    const userPhone = req.user?.phone?.trim();

    const matchConditions = [];
    // Link guest orders strictly by verified email (prevents unverified phone order hijacking)
    if (userEmail) {
      matchConditions.push({ guestEmail: userEmail });
    }

    // Auto-link any matching orders that didn't have user ID set
    if (matchConditions.length > 0) {
      await Order.updateMany(
        { user: null, $or: matchConditions },
        { $set: { user: req.user._id } }
      );
    }

    const orders = await Order.find({
      $or: [
        { user: req.user._id },
        ...(matchConditions.length ? matchConditions : []),
      ],
    }).sort('-createdAt');

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/track?orderId=&phone=&email= — guest or customer tracking
export const trackOrder = async (req, res, next) => {
  try {
    const { orderId, phone, email } = req.query;
    if (!orderId) {
      res.status(400);
      throw new Error('Order ID is required');
    }

    const trimmedId = String(orderId).trim();

    // Query by either Mongo ObjectId or human-readable orderId
    const queryConditions = [{ orderId: trimmedId.toUpperCase() }];
    if (mongoose.isValidObjectId(trimmedId)) {
      queryConditions.push({ _id: trimmedId });
    }

    const order = await Order.findOne({ $or: queryConditions });
    if (!order) {
      res.status(404);
      throw new Error('Order not found with provided ID');
    }

    // Verification: if user is authenticated and is owner/admin, allow directly
    const isOwner = req.user && order.user && String(order.user) === String(req.user._id);
    const isAdmin = hasAdminPermission(req.user, 'orders');

    if (!isOwner && !isAdmin) {
      const normInputPhone = normalizePhoneForStrictMatch(phone);
      const normShippingPhone = normalizePhoneForStrictMatch(order.shippingAddress?.phone);
      const normGuestPhone = normalizePhoneForStrictMatch(order.guestPhone);
      const phoneMatch = normInputPhone && normInputPhone.length >= 10 && (
        normInputPhone === normShippingPhone ||
        normInputPhone === normGuestPhone
      );

      const cleanEmail = email ? String(email).trim().toLowerCase() : '';
      const emailMatch = cleanEmail && order.guestEmail && order.guestEmail.toLowerCase() === cleanEmail;

      if (!phoneMatch && !emailMatch) {
        res.status(403);
        throw new Error('Access denied. Please provide the contact phone number or email used during checkout.');
      }
    }

    res.json({
      _id: order._id,
      orderId: order.orderId || `#${String(order._id).slice(-8).toUpperCase()}`,
      orderStatus: order.orderStatus,
      status: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentDetails,
      transactionId: order.transactionId || '',
      paymentScreenshot: order.paymentScreenshot || '',
      paymentScreenshotUploadedAt: order.paymentScreenshotUploadedAt || null,
      items: order.items,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      total: order.total,
      shippingAddress: order.shippingAddress,
      shipment: order.shipment || {},
      statusHistory: order.statusHistory || [],
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id — single order detail
export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const queryConditions = [{ orderId: id.toUpperCase() }];
    if (mongoose.isValidObjectId(id)) {
      queryConditions.push({ _id: id });
    }

    const order = await Order.findOne({ $or: queryConditions }).populate('user', 'name email');
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Check ownership or admin
    const isOwner = req.user && order.user && String(order.user._id || order.user) === String(req.user._id);
    const isAdmin = hasAdminPermission(req.user, 'orders');

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error('Unauthorized to view this order');
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// POST /api/orders/:id/payment-screenshot — customer uploads Easypaisa/payment receipt
export const uploadPaymentScreenshot = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { phone, email, transactionId } = req.body;

    if (!req.file) {
      res.status(400);
      throw new Error('Please select an image file to upload as payment proof.');
    }

    const trimmedId = String(id).trim();
    const queryConditions = [{ orderId: trimmedId.toUpperCase() }];
    if (mongoose.isValidObjectId(trimmedId)) {
      queryConditions.push({ _id: trimmedId });
    }

    const order = await Order.findOne({ $or: queryConditions });
    if (!order) {
      res.status(404);
      throw new Error('Order not found with provided ID');
    }

    // Verify caller: owner, admin, or contact match
    const isOwner = req.user && order.user && String(order.user) === String(req.user._id);
    const isAdmin = hasAdminPermission(req.user, 'orders');

    if (!isOwner && !isAdmin) {
      const normInputPhone = normalizePhoneForStrictMatch(phone);
      const normShippingPhone = normalizePhoneForStrictMatch(order.shippingAddress?.phone);
      const normGuestPhone = normalizePhoneForStrictMatch(order.guestPhone);
      const phoneMatch = normInputPhone && normInputPhone.length >= 10 && (
        normInputPhone === normShippingPhone ||
        normInputPhone === normGuestPhone
      );

      const cleanEmail = email ? String(email).trim().toLowerCase() : '';
      const emailMatch = cleanEmail && order.guestEmail && order.guestEmail.toLowerCase() === cleanEmail;

      if (!phoneMatch && !emailMatch) {
        res.status(403);
        throw new Error('Verification failed. Please provide the contact phone number or email matching this order.');
      }
    }

    if (String(order.paymentMethod).toLowerCase() === 'cod') {
      res.status(400);
      throw new Error('Payment proof is not required for cash on delivery orders.');
    }

    // Upload to Cloudinary or fallback to local disk
    let uploadResult;
    if (isCloudinaryConfigured()) {
      try {
        uploadResult = await streamUploadToCloudinary(req.file.buffer, 'karakoram-store/payment-proofs');
      } catch (cloudErr) {
        console.warn('Cloudinary upload error:', cloudErr.message);
        uploadResult = await saveToLocalDisk(req, req.file, 'payment-proofs');
      }
    } else {
      uploadResult = await saveToLocalDisk(req, req.file, 'payment-proofs');
    }

    // Store screenshot URL and upload timestamp
    order.paymentScreenshot = uploadResult.url;
    order.paymentScreenshotUploadedAt = new Date();

    if (transactionId && typeof transactionId === 'string' && transactionId.trim()) {
      order.transactionId = transactionId.trim();
    }

    // Append to status history
    order.statusHistory.push({
      status: order.orderStatus,
      changedAt: new Date(),
      note: `Customer uploaded payment proof screenshot${order.transactionId ? ` (TRX ID: ${order.transactionId})` : ''}. Awaiting admin verification.`,
      changedBy: req.user?.name || order.shippingAddress?.name || 'Customer',
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment screenshot uploaded successfully! Admin will verify and confirm your order shortly.',
      paymentScreenshot: order.paymentScreenshot,
      paymentScreenshotUploadedAt: order.paymentScreenshotUploadedAt,
      transactionId: order.transactionId,
    });
  } catch (err) {
    next(err);
  }
};
