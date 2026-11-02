/**
 * Shared rate limiters used across the app.
 * Defined here to avoid circular imports between app.js and route files.
 */
import rateLimit from 'express-rate-limit';

// Global API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for order tracking (enumeration vector — orderId + phone/email)
export const orderTrackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many order tracking attempts. Please wait before trying again.' },
});

// Stricter limiter for payment screenshot upload (storage abuse vector)
export const paymentUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many payment upload attempts. Please wait before trying again.' },
});

// Checkout limiter — prevent abuse
export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many checkout attempts. Please wait before trying again.' },
});
