import mongoose from 'mongoose';
import { z } from 'zod';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

const addressSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
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
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),

  items: z.array(orderItemInputSchema).min(1),
  shippingAddress: addressSchema,
  paymentMethod: z.enum(['COD', 'bank_transfer']),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

/** Flat shipping rate in PKR */
const SHIPPING_COST = 200;

// POST /api/orders
export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const data = createOrderSchema.parse(req.body);

    // Guest orders require contact details
    if (!req.user && (!data.guestName || !data.guestPhone)) {
      res.status(400);
      throw new Error('Guest name and phone are required for guest orders');
    }

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

      orderItems.push({
        product: product._id,
        name: product.name,
        variantLabel: input.variantLabel,
        price: variant.price,   // server-calculated price
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

    const order = await Order.create(
      [
        {
          user: req.user?._id || null,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          items: orderItems,
          shippingAddress: data.shippingAddress,
          paymentMethod: data.paymentMethod,
          couponCode: data.couponCode || '',
          notes: data.notes || '',
          subtotal,
          shippingCost: SHIPPING_COST,
          discount,
          total,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(order[0]);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

// GET /api/orders/my — logged-in user's orders
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/track?orderId=&phone= — guest tracking
export const trackOrder = async (req, res, next) => {
  try {
    const { orderId, phone } = req.query;
    if (!orderId || !phone) {
      res.status(400);
      throw new Error('orderId and phone are required');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Verify phone matches guest or shipping address
    const phoneMatch =
      order.guestPhone === phone || order.shippingAddress?.phone === phone;

    if (!phoneMatch) {
      res.status(403);
      throw new Error('Phone number does not match this order');
    }

    res.json({
      _id: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      items: order.items,
      total: order.total,
      createdAt: order.createdAt,
    });
  } catch (err) {
    next(err);
  }
};
