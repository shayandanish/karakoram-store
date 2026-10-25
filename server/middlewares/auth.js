import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/** Protect route — requires valid JWT in httpOnly cookie */
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      res.status(401);
      throw new Error('Not authorised, no token');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-passwordHash');

    if (!req.user) {
      res.status(401);
      throw new Error('Not authorised, user not found');
    }

    next();
  } catch (err) {
    next(err);
  }
};

/** Restrict to admin role only — must come after protect() */
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403);
    return next(new Error('Admin access required'));
  }
  next();
};

/** Optional auth — attaches req.user if a valid token is present, but allows guests */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
    }
  } catch (err) {
    req.user = null;
  }
  next();
};
