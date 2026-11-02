import { describe, expect, it } from 'vitest';
import { getRevenueStartDate } from '../../utils/dashboardStats.js';

describe('getRevenueStartDate', () => {
  const now = new Date('2026-11-03T08:30:00.000Z');

  it('returns no date for all-time revenue', () => {
    expect(getRevenueStartDate('all', now)).toBeNull();
  });

  it('returns the first UTC calendar day in the 7-day period', () => {
    expect(getRevenueStartDate('7d', now).toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });

  it('returns the first UTC calendar day in the 30-day period', () => {
    expect(getRevenueStartDate('30d', now).toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('rejects unsupported revenue periods', () => {
    expect(() => getRevenueStartDate('90d', now)).toThrow(RangeError);
  });
});
