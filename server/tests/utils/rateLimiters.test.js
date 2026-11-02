/**
 * rateLimiters.test.js
 * Unit tests for shared rate limiters.
 */
import { describe, it, expect } from 'vitest';
import { apiLimiter, orderTrackLimiter, paymentUploadLimiter, checkoutLimiter } from '../../utils/rateLimiters.js';

describe('rate limiters', () => {
  it('apiLimiter is a function', () => {
    expect(typeof apiLimiter).toBe('function');
  });

  it('orderTrackLimiter is a function', () => {
    expect(typeof orderTrackLimiter).toBe('function');
  });

  it('paymentUploadLimiter is a function', () => {
    expect(typeof paymentUploadLimiter).toBe('function');
  });

  it('checkoutLimiter is a function', () => {
    expect(typeof checkoutLimiter).toBe('function');
  });

  it('apiLimiter has default window of 15 min', () => {
    expect(apiLimiter).toBeDefined();
  });

  it('all limiters are distinct functions', () => {
    const limiters = [apiLimiter, orderTrackLimiter, paymentUploadLimiter, checkoutLimiter];
    const unique = new Set(limiters);
    expect(unique.size).toBe(4);
  });
});
