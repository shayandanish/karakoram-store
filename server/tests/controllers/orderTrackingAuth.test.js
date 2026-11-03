import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  normalizePhoneForStrictMatch,
  trackOrder,
} from '../../controllers/orderController.js';
import Order from '../../models/Order.js';

vi.mock('../../models/Order.js');

describe('Order Tracking Authorization & Phone Normalization', () => {
  describe('normalizePhoneForStrictMatch', () => {
    it('normalizes local Pakistani phone 03001234567 to 10-digit subscriber string', () => {
      expect(normalizePhoneForStrictMatch('03001234567')).toBe('3001234567');
    });

    it('normalizes international Pakistani phone +92 300 1234567 to the same 10-digit string', () => {
      expect(normalizePhoneForStrictMatch('+92 300 1234567')).toBe('3001234567');
      expect(normalizePhoneForStrictMatch('923001234567')).toBe('3001234567');
      expect(normalizePhoneForStrictMatch('+92-300-1234567')).toBe('3001234567');
    });

    it('returns raw digits if length is less than 10', () => {
      expect(normalizePhoneForStrictMatch('567')).toBe('567');
      expect(normalizePhoneForStrictMatch('')).toBe('');
      expect(normalizePhoneForStrictMatch(null)).toBe('');
    });

    it('prevents suffix-only matching (rejection of loose endsWith)', () => {
      const storedPhone = normalizePhoneForStrictMatch('03001234567');
      const attackerSuffix = normalizePhoneForStrictMatch('4567');
      expect(storedPhone === attackerSuffix).toBe(false);
    });
  });

  describe('trackOrder authorization', () => {
    let req, res, next;
    const mockOrder = {
      _id: '507f1f77bcf86cd799439011',
      orderId: 'KS-2026-000001-A1B2',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      guestEmail: 'customer@example.com',
      guestPhone: '03001234567',
      shippingAddress: { phone: '03001234567' },
      items: [],
      subtotal: 1000,
      total: 1200,
    };

    beforeEach(() => {
      req = {
        query: {
          orderId: 'KS-2026-000001-A1B2',
        },
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      next = vi.fn();
      vi.clearAllMocks();
      Order.findOne = vi.fn().mockResolvedValue(mockOrder);
    });

    it('rejects access when neither phone nor email is supplied', async () => {
      await trackOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/Access denied/i) })
      );
    });

    it('rejects access when an attacker provides only a suffix of the phone number', async () => {
      req.query.phone = '4567';
      await trackOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects access when wrong phone or wrong email is provided', async () => {
      req.query.phone = '03119999999';
      req.query.email = 'wrong@example.com';
      await trackOrder(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows access with exact matching guest email (case-insensitive)', async () => {
      req.query.email = 'CUSTOMER@example.com';
      await trackOrder(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'KS-2026-000001-A1B2' })
      );
    });

    it('allows access with international format of matching phone', async () => {
      req.query.phone = '+92 300 1234567';
      await trackOrder(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'KS-2026-000001-A1B2' })
      );
    });

    it('allows access automatically if user is authenticated admin', async () => {
      req.user = { role: 'admin' };
      await trackOrder(req, res, next);
      expect(res.json).toHaveBeenCalled();
    });

    it('allows access automatically if user is the authenticated owner of the order', async () => {
      mockOrder.user = 'user_123';
      req.user = { _id: 'user_123' };
      await trackOrder(req, res, next);
      expect(res.json).toHaveBeenCalled();
    });
  });
});

