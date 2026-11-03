import { describe, expect, it } from 'vitest';
import {
  addressSchema,
  orderItemInputSchema,
  createOrderSchema,
} from '../../controllers/orderController.js';

describe('Order Validation Schemas (Zod Bounds & Formatting)', () => {
  describe('orderItemInputSchema', () => {
    it('accepts valid item with reasonable quantity', () => {
      const valid = {
        product: '507f1f77bcf86cd799439011',
        variantLabel: '500g',
        quantity: 3,
      };
      expect(orderItemInputSchema.parse(valid)).toEqual(valid);
    });

    it('rejects quantities above 50 (burst/abuse guard)', () => {
      const excessive = {
        product: '507f1f77bcf86cd799439011',
        variantLabel: '500g',
        quantity: 51,
      };
      expect(() => orderItemInputSchema.parse(excessive)).toThrow(/Quantity cannot exceed 50 per item/);
    });

    it('rejects zero or negative quantities', () => {
      expect(() =>
        orderItemInputSchema.parse({
          product: '507f1f77bcf86cd799439011',
          variantLabel: '500g',
          quantity: 0,
        })
      ).toThrow();
    });

    it('rejects invalid product ObjectId length', () => {
      expect(() =>
        orderItemInputSchema.parse({
          product: 'invalid-id',
          variantLabel: '500g',
          quantity: 1,
        })
      ).toThrow(/Invalid product id/);
    });
  });

  describe('addressSchema', () => {
    const validAddress = {
      name: 'Ali Khan',
      phone: '03001234567',
      street: 'House 12, Street 4, Sector F-7',
      city: 'Islamabad',
      province: 'Federal',
      country: 'Pakistan',
    };

    it('validates correct Pakistani local phone numbers', () => {
      expect(addressSchema.parse(validAddress)).toMatchObject({
        city: 'Islamabad',
        phone: '03001234567',
      });
    });

    it('validates Pakistani phone numbers with country code 923...', () => {
      const addr = { ...validAddress, phone: '923001234567' };
      expect(addressSchema.parse(addr).phone).toBe('923001234567');
    });

    it('rejects phone numbers that do not match valid length / formatting', () => {
      expect(() =>
        addressSchema.parse({ ...validAddress, phone: '123' })
      ).toThrow(/Phone number is too short/);
    });

    it('enforces maximum string length on names and addresses', () => {
      const tooLongName = 'A'.repeat(101);
      expect(() =>
        addressSchema.parse({ ...validAddress, name: tooLongName })
      ).toThrow();
    });
  });

  describe('createOrderSchema bounds', () => {
    const validOrder = {
      guestName: 'Kareem Ahmed',
      guestPhone: '03001234567',
      guestEmail: 'kareem@gmail.com',
      shippingAddress: {
        name: 'Kareem Ahmed',
        phone: '03001234567',
        street: 'Main Bazaar',
        city: 'Karimabad',
        province: 'Gilgit-Baltistan',
        country: 'Pakistan',
      },
      items: [
        {
          product: '507f1f77bcf86cd799439011',
          variantLabel: '250g',
          quantity: 2,
        },
      ],
      paymentMethod: 'COD',
      couponCode: 'WELCOME10',
    };

    it('successfully validates a well-formed guest order', () => {
      const parsed = createOrderSchema.parse(validOrder);
      expect(parsed.couponCode).toBe('WELCOME10');
      expect(parsed.items).toHaveLength(1);
    });

    it('rejects orders with more than 30 items line entries', () => {
      const excessiveItems = Array.from({ length: 31 }, () => ({
        product: '507f1f77bcf86cd799439011',
        variantLabel: 'Standard',
        quantity: 1,
      }));

      expect(() =>
        createOrderSchema.parse({ ...validOrder, items: excessiveItems })
      ).toThrow(/Cannot exceed 30 items per order/);
    });

    it('rejects notes longer than 500 characters', () => {
      const longNotes = 'x'.repeat(501);
      expect(() =>
        createOrderSchema.parse({ ...validOrder, notes: longNotes })
      ).toThrow();
    });
  });
});

