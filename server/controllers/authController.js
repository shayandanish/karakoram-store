import bcrypt from 'bcrypt';
import { z } from 'zod';
import User from '../models/User.js';
import { sendTokenCookie, clearTokenCookie } from '../utils/jwt.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
});

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await User.findOne({ email: data.email });
    if (exists) {
      res.status(409);
      throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({ name: data.name, email: data.email, phone: data.phone, passwordHash });

    sendTokenCookie(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email });
    if (!user) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    sendTokenCookie(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
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
  const { _id, name, email, phone, role, addresses } = req.user;
  res.json({ _id, name, email, phone, role, addresses });
};
