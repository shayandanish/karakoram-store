import bcrypt from 'bcrypt';
import { z } from 'zod';
import User from '../models/User.js';
import { verifyFirebaseIdToken } from '../utils/firebaseAdmin.js';
import { sendTokenCookie, clearTokenCookie } from '../utils/jwt.js';
import { generateOtp, sendOtpEmail } from '../utils/mailer.js';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  sendOtp: z.boolean().optional(),
});

const firebaseRegisterSchema = z.object({
  idToken: z.string().trim().min(20, 'Missing Firebase ID token'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
});

const firebaseLoginSchema = z.object({
  idToken: z.string().trim().min(20, 'Missing Firebase ID token'),
});

const sendOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long').optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  otp: z.union([
    z.string().trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
    z.number().int().min(100000, 'OTP must be a 6-digit number').max(999999, 'OTP must be a 6-digit number').transform((n) => n.toString()),
  ]),
});

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'unverified',
  isVerified: !!user.isVerified,
});

const httpError = (message, statusCode, code) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

/** Verify the Firebase token and refuse unverified email addresses. */
const verifyFirebaseToken = async (idToken) => {
  let decoded;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch {
    throw httpError('Your sign-in session is invalid or has expired. Please try again.', 401);
  }

  if (!decoded.email || typeof decoded.email !== 'string') {
    throw httpError('This account has no email address.', 400);
  }

  if (decoded.email_verified !== true) {
    throw httpError('Please verify your email address before continuing.', 403, 'EMAIL_NOT_VERIFIED');
  }

  return decoded;
};

/**
 * Find the MongoDB user for a verified Firebase token, linking an existing
 * account by email (e.g. the seeded admin) when needed. The same verified
 * email may sign in through more than one Firebase provider (Google,
 * email/password), so the first linked UID is kept rather than replaced.
 */
const findOrLinkFirebaseUser = async (decoded, { name, phone, createIfMissing = false } = {}) => {
  const email = decoded.email.toLowerCase();
  const uid = decoded.uid;
  const emailVerified = decoded.email_verified === true;

  const link = async (user) => {
    let changed = false;

    // Keep the first linked Firebase identity, but allow the same verified
    // email to sign in with another provider (e.g. Google + email/password).
    // Firebase has already confirmed ownership of the email address.
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      changed = true;
    }
    if (phone && !user.phone) {
      user.phone = phone;
      changed = true;
    }

    // Google (and any verified Firebase provider) should not leave an
    // otherwise valid account marked as unverified.
    if (emailVerified && (!user.isVerified || user.status !== 'verified')) {
      user.isVerified = true;
      user.status = 'verified';
      changed = true;
    }

    if (changed) await user.save();
    return user;
  };

  const byUid = await User.findOne({ firebaseUid: uid });
  if (byUid) return link(byUid);

  const byEmail = await User.findOne({ email });
  if (byEmail) return link(byEmail);

  if (!createIfMissing) return null;

  return User.create({
    firebaseUid: uid,
    email,
    // Name comes from the registration form; fall back to the Firebase profile
    name: name?.trim() || decoded.name?.trim() || email.split('@')[0] || 'Customer',
    phone: phone || undefined,
    role: 'customer',
    status: emailVerified ? 'verified' : 'unverified',
    isVerified: emailVerified,
  });
};

/**
 * POST /api/auth/firebase-register
 * Creates (or returns) the MongoDB user only after Firebase confirms the email.
 */
export const firebaseRegister = async (req, res, next) => {
  try {
    const data = firebaseRegisterSchema.parse(req.body);
    const decoded = await verifyFirebaseToken(data.idToken);

    let user;
    try {
      user = await findOrLinkFirebaseUser(decoded, {
        name: data.name,
        phone: data.phone,
        createIfMissing: true,
      });
    } catch (err) {
      // Two simultaneous registrations can race on the unique indexes
      if (err?.code === 11000) {
        user = await findOrLinkFirebaseUser(decoded, {
          name: data.name,
          phone: data.phone,
          createIfMissing: false,
        });
        if (!user) throw err;
      } else {
        throw err;
      }
    }

    sendTokenCookie(res, user._id);
    res.status(201).json(publicUser(user));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/firebase-login
 * Issues the normal httpOnly JWT cookie for a verified Firebase user.
 * Covers both email/password and Google sign-in; a customer record is
 * created automatically on the first Google sign-in.
 */
export const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = firebaseLoginSchema.parse(req.body);
    const decoded = await verifyFirebaseToken(idToken);

    let user;
    try {
      user = await findOrLinkFirebaseUser(decoded, { createIfMissing: true });
    } catch (err) {
      if (err?.code === 11000) {
        user = await findOrLinkFirebaseUser(decoded, { createIfMissing: false });
        if (!user) throw err;
      } else {
        throw err;
      }
    }

    if (!user) {
      throw httpError('No account found for this email. Please register first.', 404);
    }

    sendTokenCookie(res, user._id);
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Legacy email/password login, kept for the seeded admin account only.
 */
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user || user.role !== 'admin' || !user.passwordHash) {
      throw httpError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw httpError('Invalid email or password', 401);
    }

    sendTokenCookie(res, user._id);
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me
export const getMe = (req, res) => {
  const { _id, name, email, phone, role, addresses, status, isVerified } = req.user;
  res.json({ _id, name, email, phone, role, addresses, status, isVerified });
};

/**
 * POST /api/auth/send-otp
 * Generates a random 6-digit OTP, stores it in the MongoDB user document
 * along with an expiry timestamp (10 minutes), and sends it using Nodemailer.
 */
export const sendOtp = async (req, res, next) => {
  try {
    const data = sendOtpSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        name: data.name?.trim() || normalizedEmail.split('@')[0] || 'Customer',
        status: 'unverified',
        isVerified: false,
      });
    }

    const otp = generateOtp();
    const expiryMinutes = 10;
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.otpExpires = otpExpiresAt;
    await user.save();

    const { previewUrl } = await sendOtpEmail({
      to: user.email,
      otp,
      userName: user.name,
    });

    res.status(200).json({
      success: true,
      message: 'A 6-digit OTP has been sent to your email address.',
      email: user.email,
      expiresIn: `${expiryMinutes} minutes`,
      previewUrl: previewUrl || undefined,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies the user's OTP by comparing it with the stored OTP and expiry timestamp,
 * updating the user's status to verified once successful.
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();
    const cleanOtp = String(data.otp).trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw httpError('No account found with this email address.', 404);
    }

    if (!user.otp || (!user.otpExpiresAt && !user.otpExpires)) {
      throw httpError('No pending OTP verification request found. Please request a new OTP.', 400);
    }

    const expiryTime = user.otpExpiresAt || user.otpExpires;

    if (new Date() > new Date(expiryTime)) {
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      user.otpExpires = undefined;
      await user.save();

      throw httpError('The OTP code has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    if (user.otp !== cleanOtp) {
      throw httpError('Invalid OTP code. Please check and try again.', 400, 'INVALID_OTP');
    }

    // OTP match verified! Update user status to verified
    user.status = 'verified';
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.otpExpires = undefined;
    await user.save();

    sendTokenCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. Your account is now verified.',
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register
 * Creates or updates an unverified account and optionally sends an email OTP.
 */
export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.status === 'verified') {
      throw httpError('An account with this email address already exists. Please log in.', 409);
    }

    let passwordHash;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 12);
    }

    let user;
    if (existingUser) {
      if (data.name) existingUser.name = data.name.trim();
      if (passwordHash) existingUser.passwordHash = passwordHash;
      if (data.phone) existingUser.phone = data.phone.trim();
      user = await existingUser.save();
    } else {
      user = await User.create({
        name: data.name?.trim() || normalizedEmail.split('@')[0] || 'Customer',
        email: normalizedEmail,
        phone: data.phone?.trim() || undefined,
        passwordHash: passwordHash || undefined,
        status: 'unverified',
        isVerified: false,
        role: 'customer',
      });
    }

    // Optionally send verification OTP via Nodemailer
    let previewUrl;
    if (data.sendOtp !== false) {
      const otp = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
      user.otpExpires = otpExpiresAt;
      await user.save();

      try {
        const mailResult = await sendOtpEmail({
          to: user.email,
          otp,
          userName: user.name,
        });
        previewUrl = mailResult.previewUrl;
      } catch (mailErr) {
        console.warn(`[Nodemailer] Could not send OTP email: ${mailErr.message}`);
      }
    }

    sendTokenCookie(res, user._id);

    res.status(201).json({
      success: true,
      message:
        data.sendOtp === false
          ? 'Registration complete.'
          : 'Registration complete. Please verify your email with the OTP sent to your inbox.',
      user: publicUser(user),
      previewUrl: previewUrl || undefined,
    });
  } catch (err) {
    next(err);
  }
};
