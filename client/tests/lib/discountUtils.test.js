/**
 * discountUtils.test.js
 * Unit tests for calculateDiscountedPrice, getVariantDiscount, and getBestVariantDiscount.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDiscountedPrice,
  getVariantDiscount,
  getBestVariantDiscount,
} from '../../src/lib/discountUtils';

describe('calculateDiscountedPrice', () => {
  it('calculates correct sale price and savings', () => {
    const r = calculateDiscountedPrice(1000, 20);
    expect(r.salePrice).toBe(800);
    expect(r.savingsAmount).toBe(200);
    expect(r.savingsPct).toBe(20);
  });

  it('clamps discount to max 99%', () => {
    const r = calculateDiscountedPrice(1000, 150);
    expect(r.salePrice).toBe(10);
    expect(r.savingsPct).toBe(99);
  });

  it('clamps discount to min 1%', () => {
    const r = calculateDiscountedPrice(1000, 0);
    expect(r).toBeNull();
  });

  it('returns null for invalid price', () => {
    expect(calculateDiscountedPrice(0, 20)).toBeNull();
    expect(calculateDiscountedPrice('abc', 20)).toBeNull();
    expect(calculateDiscountedPrice(1000, 'abc')).toBeNull();
    expect(calculateDiscountedPrice(-100, 20)).toBeNull();
  });

  it('ensures minimum sale price of 1', () => {
    const r = calculateDiscountedPrice(2, 99);
    expect(r.salePrice).toBe(1);
  });
});

describe('getVariantDiscount — discountPercent path', () => {
  it('returns discount when discountPercent > 0', () => {
    const r = getVariantDiscount({ price: 1000, discountPercent: 20 });
    expect(r.hasDiscount).toBe(true);
    expect(r.salePrice).toBe(800);
    expect(r.originalPrice).toBe(1000);
    expect(r.savingsPct).toBe(20);
    expect(r.badge).toBe('20% OFF');
  });

  it('uses custom discountLabel as badge', () => {
    const r = getVariantDiscount({ price: 1000, discountPercent: 20, discountLabel: 'Eid Sale' });
    expect(r.badge).toBe('Eid Sale');
  });

  it('returns no discount when discountPercent is 0', () => {
    const r = getVariantDiscount({ price: 1000, discountPercent: 0 });
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(1000);
    expect(r.originalPrice).toBeNull();
  });

  it('returns no discount when discountPercent is null', () => {
    const r = getVariantDiscount({ price: 1000, discountPercent: null });
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(1000);
  });

  it('handles null variant gracefully', () => {
    const r = getVariantDiscount(null);
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(0);
  });
});

describe('getVariantDiscount — compareAtPrice fallback path', () => {
  it('returns discount when compareAtPrice > price', () => {
    const r = getVariantDiscount({ price: 800, compareAtPrice: 1000 });
    expect(r.hasDiscount).toBe(true);
    expect(r.salePrice).toBe(800);
    expect(r.originalPrice).toBe(1000);
    expect(r.savingsPct).toBe(20);
  });

  it('returns no discount when compareAtPrice equals price', () => {
    const r = getVariantDiscount({ price: 1000, compareAtPrice: 1000 });
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(1000);
  });

  it('returns no discount when compareAtPrice < price', () => {
    const r = getVariantDiscount({ price: 1200, compareAtPrice: 1000 });
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(1200);
  });
});

describe('getBestVariantDiscount', () => {
  it('returns best discount among variants', () => {
    const variants = [
      { price: 1000, discountPercent: 10 },
      { price: 1000, discountPercent: 30 },
      { price: 1000, discountPercent: 20 },
    ];
    const r = getBestVariantDiscount(variants);
    expect(r.hasDiscount).toBe(true);
    expect(r.savingsPct).toBe(30);
    expect(r.salePrice).toBe(700);
  });

  it('returns no discount when none have discounts', () => {
    const variants = [
      { price: 1000 },
      { price: 1200 },
    ];
    const r = getBestVariantDiscount(variants);
    expect(r.hasDiscount).toBe(false);
    expect(r.salePrice).toBe(1000);
  });

  it('returns no-discount for empty variants array', () => {
    const r = getBestVariantDiscount([]);
    expect(r.hasDiscount).toBe(false);
  });

  it('uses first variant when none discounted', () => {
    const variants = [{ price: 500 }, { price: 300 }];
    const r = getBestVariantDiscount(variants);
    expect(r.salePrice).toBe(500);
  });
});
