import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtp, verifyOtp } from '../controllers/authController.js';

const router = Router();

const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please wait a few minutes before trying again.' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP verification attempts. Please wait a few minutes and try again.' },
});

// POST /api/otp/send and POST /api/otp/request
router.post('/send', sendOtpLimiter, sendOtp);
router.post('/request', sendOtpLimiter, sendOtp);
router.post('/generate', sendOtpLimiter, sendOtp);

// POST /api/otp/verify
router.post('/verify', verifyOtpLimiter, verifyOtp);

export default router;
