import mongoose from 'mongoose';
import { z } from 'zod';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import User from '../models/User.js';
import { generateOrderId } from '../utils/orderIdGenerator.js';
import { dispatchOrderNotifications } from '../utils/notificationService.js';
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

const addressSchema = z.object({
  name: z.string().min(2),
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
  street: z.string().min(3),
  city: z.string().min(2),
  province: z.string().min(2),
  postalCode: z.string().optional(),
  country: z.string().default('Pakistan'),
});

const orderItemInputSchema = z.object({
  product: z.string().length(24, 'Invalid product id'),
  variantLabel: z.string().min(1),
  quantity: z.number().int().min(1),
});

const createOrderSchema = z.object({
  // Guest fields (required when not logged in)
  guestName: z.string().optional(),
  guestEmail: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || checkEmailDomain(val) === null,
      (val) => ({ message: checkEmailDomain(val) || 'Invalid email address' })
    ),
  guestPhone: z.string().min(7, 'Phone number is too short').max(20).optional(),

  items: z.array(orderItemInputSchema).min(1),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(['easypaisa', 'COD', 'bank_transfer']).default('easypaisa'),
  transactionId: z.string().optional(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),

  // Communication & WhatsApp preferences
  whatsappConsent: z.boolean().optional().default(true),
  whatsappPhone: z.string().optional(),
});

/** Flat shipping rate in PKR */
const SHIPPING_COST = 200;

// POST /api/orders
export const createOrder = async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);

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
          const product = await Product.findById(input.product).session(session);
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

          // Reduce stock atomically
          await Product.updateOne(
            { _id: product._id, 'variants.label': input.variantLabel },
            { $inc: { 'variants.$.stock': -input.quantity } },
            { session }
          );

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
            quantity: input.quantity,
            image: product.images?.[0]?.url || '',
          });
        }

        // Server-side totals
        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        let discount = 0;

        // Apply coupon if provided
        if (data.couponCode) {
          const coupon = await Coupon.findOne({
            code: data.couponCode.toUpperCase(),
            isActive: true,
            expiry: { $gte: new Date() },
            $expr: { $lt: ['$usedCount', '$usageLimit'] },
          }).session(session);

          if (coupon) {
            discount =
              coupon.discountType === 'percentage'
                ? (subtotal * coupon.value) / 100
                : coupon.value;

            // Increment usage count
            await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } }, { session });
          }
        }

        const total = Math.max(0, subtotal + SHIPPING_COST - discount);

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
              paymentMethod: data.paymentMethod || 'easypaisa',
              transactionId: data.transactionId || '',
              orderStatus: 'pending',
              statusHistory: initialHistory,
              couponCode: data.couponCode || '',
              notes: data.notes || '',
              whatsappConsent: data.whatsappConsent !== false,
              whatsappPhone: data.whatsappPhone || data.shippingAddress.phone || data.guestPhone || '',
              subtotal,
              shippingCost: SHIPPING_COST,
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
    if (userEmail) matchConditions.push({ guestEmail: userEmail });
    if (userPhone) {
      matchConditions.push({ guestPhone: userPhone });
      matchConditions.push({ 'shippingAddress.phone': userPhone });
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
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      const orderShippingPhone = order.shippingAddress?.phone ? String(order.shippingAddress.phone).replace(/\D/g, '') : '';
      const orderGuestPhone = order.guestPhone ? String(order.guestPhone).replace(/\D/g, '') : '';
      const phoneMatch = cleanPhone && (cleanPhone === orderShippingPhone || cleanPhone === orderGuestPhone || orderShippingPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderShippingPhone));

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
    const isAdmin = req.user?.role === 'admin';

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
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
      const orderShippingPhone = order.shippingAddress?.phone ? String(order.shippingAddress.phone).replace(/\D/g, '') : '';
      const orderGuestPhone = order.guestPhone ? String(order.guestPhone).replace(/\D/g, '') : '';
      const phoneMatch = cleanPhone && (
        cleanPhone === orderShippingPhone ||
        cleanPhone === orderGuestPhone ||
        orderShippingPhone.endsWith(cleanPhone) ||
        cleanPhone.endsWith(orderShippingPhone)
      );

      const cleanEmail = email ? String(email).trim().toLowerCase() : '';
      const emailMatch = cleanEmail && order.guestEmail && order.guestEmail.toLowerCase() === cleanEmail;

      if (!phoneMatch && !emailMatch) {
        res.status(403);
        throw new Error('Verification failed. Please provide the contact phone number or email matching this order.');
      }
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
