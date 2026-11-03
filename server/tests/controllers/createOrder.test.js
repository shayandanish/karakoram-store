import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Product from '../../models/Product.js';
import Coupon from '../../models/Coupon.js';
import Order from '../../models/Order.js';
import User from '../../models/User.js';
import SiteSettings from '../../models/SiteSettings.js';
import { createOrder } from '../../controllers/orderController.js';
import { getEnabledPaymentMethod } from '../../utils/paymentMethods.js';
import { generateOrderId } from '../../utils/orderIdGenerator.js';
import { dispatchOrderNotifications } from '../../utils/notificationService.js';

vi.mock('../../models/Product.js', () => ({
  default: { findById: vi.fn(), updateOne: vi.fn() },
}));
vi.mock('../../models/Coupon.js', () => ({
  default: { findOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock('../../models/Order.js', () => ({
  default: { create: vi.fn(), countDocuments: vi.fn() },
}));
vi.mock('../../models/User.js', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('../../models/SiteSettings.js', () => ({
  default: { getSingleton: vi.fn() },
}));
vi.mock('../../utils/paymentMethods.js', () => ({
  getEnabledPaymentMethod: vi.fn(),
}));
vi.mock('../../utils/orderIdGenerator.js', () => ({
  generateOrderId: vi.fn(),
}));
vi.mock('../../utils/notificationService.js', () => ({
  dispatchOrderNotifications: vi.fn(),
}));

const product = {
  _id: 'product-id',
  name: 'Apricot Oil',
  isActive: true,
  images: [{ url: 'https://example.com/oil.webp' }],
  variants: [{ label: '500g', price: 1000, stock: 5 }],
};

const orderBody = {
  guestName: 'Customer Name',
  guestEmail: 'customer@example.com',
  guestPhone: '03001234567',
  shippingAddress: {
    name: 'Customer Name',
    phone: '03001234567',
    street: 'Main Road',
    city: 'Karimabad',
    province: 'Gilgit-Baltistan',
  },
  items: [{
    product: '507f1f77bcf86cd799439011',
    variantLabel: '500g',
    quantity: 2,
    price: 1,
  }],
  paymentMethod: 'cod',
};

describe('createOrder', () => {
  let req;
  let res;
  let next;
  let session;
  let productQuery;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: structuredClone(orderBody) };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
    session = {
      withTransaction: vi.fn(async (callback) => callback()),
      endSession: vi.fn(),
    };
    vi.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    productQuery = {
      select: vi.fn().mockReturnThis(),
      session: vi.fn().mockResolvedValue(product),
    };
    Product.findById.mockReturnValue(productQuery);
    Product.updateOne.mockResolvedValue({ modifiedCount: 1 });
    SiteSettings.getSingleton.mockResolvedValue({ shippingFee: 200 });
    getEnabledPaymentMethod.mockReturnValue({ id: 'cod', name: 'Cash on delivery' });
    generateOrderId.mockResolvedValue('KS-2026-000001-ABCD');
    User.findOne.mockReturnValue({ session: vi.fn().mockResolvedValue(null) });
    Order.countDocuments.mockReturnValue({ session: vi.fn().mockResolvedValue(0) });
    Order.create.mockResolvedValue([{
      orderId: 'KS-2026-000001-ABCD',
      total: 2200,
    }]);
    dispatchOrderNotifications.mockResolvedValue(undefined);
  });

  it('uses server prices and quantities rather than a client-supplied price', async () => {
    await createOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(Order.create).toHaveBeenCalledWith(
      [expect.objectContaining({
        items: [expect.objectContaining({ price: 1000, quantity: 2 })],
        subtotal: 2000,
        total: 2200,
      })],
      { session }
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('uses the matching delivery zone rate and saves its estimate snapshot', async () => {
    SiteSettings.getSingleton.mockResolvedValue({
      shippingFee: 200,
      deliveryMinDays: 2,
      deliveryMaxDays: 5,
      deliveryZones: [{
        id: 'gb',
        name: 'Gilgit-Baltistan',
        cities: ['Karimabad'],
        provinces: ['Gilgit-Baltistan'],
        shippingFee: 350,
        minDays: 1,
        maxDays: 3,
        enabled: true,
      }],
    });

    await createOrder(req, res, next);

    expect(Order.create).toHaveBeenCalledWith(
      [expect.objectContaining({
        shippingCost: 350,
        shippingZone: 'Gilgit-Baltistan',
        deliveryEstimate: expect.objectContaining({ minDays: 1, maxDays: 3 }),
        total: 2350,
      })],
      { session }
    );
  });

  it('rejects a stock update that lost a concurrent race', async () => {
    Product.updateOne.mockResolvedValue({ modifiedCount: 0 });

    await createOrder(req, res, next);

    expect(Order.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/Insufficient stock/i),
    }));
    expect(session.endSession).toHaveBeenCalled();
  });

  it('rejects a coupon after its per-customer limit is reached', async () => {
    req.body.couponCode = 'welcome10';
    const coupon = {
      _id: 'coupon-id',
      code: 'WELCOME10',
      isActive: true,
      discountType: 'percentage',
      value: 10,
      perCustomerLimit: 1,
      usedCount: 1,
      usageLimit: 10,
    };
    Coupon.findOne.mockReturnValue({ session: vi.fn().mockResolvedValue(coupon) });
    Order.countDocuments.mockReturnValue({ session: vi.fn().mockResolvedValue(1) });

    await createOrder(req, res, next);

    expect(Coupon.updateOne).not.toHaveBeenCalled();
    expect(Order.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/maximum allowed times/i),
    }));
  });
});
