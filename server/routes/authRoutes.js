import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  firebaseRegister,
  firebaseLogin,
  login,
  logout,
  getMe,
  sendOtp,
  verifyOtp,
  register,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';

const router = Router();

// Rate limiter for OTP registration
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Please wait a few minutes before trying again.' },
});

// Stricter limit for Firebase sign-in / sign-up endpoints (per IP)
const firebaseAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

// Rate limiters for OTP requests to prevent spam / brute-force
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

// OTP registration
router.post('/register', registerLimiter, register);

// OTP endpoints
router.post('/send-otp', sendOtpLimiter, sendOtp);
router.post('/request-otp', sendOtpLimiter, sendOtp);
router.post('/generate-otp', sendOtpLimiter, sendOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);

// Firebase email-verification flow
router.post('/firebase-register', firebaseAuthLimiter, firebaseRegister);
router.post('/firebase-login', firebaseAuthLimiter, firebaseLogin);

// Legacy password login — admin accounts only
router.post('/login', adminLoginLimiter, login);

router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
