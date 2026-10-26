import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyFirebaseIdToken } from '../utils/firebaseAdmin.js';

/** Protect route — requires valid JWT in httpOnly cookie or Authorization Bearer header */
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

    let user = null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id).select('-passwordHash');
    } catch (jwtErr) {
      try {
        const decodedFb = await verifyFirebaseIdToken(token);
        if (decodedFb?.uid) {
          user = await User.findOne({
            $or: [{ firebaseUid: decodedFb.uid }, { email: decodedFb.email?.toLowerCase() }],
          }).select('-passwordHash');
        }
      } catch {
        throw jwtErr;
      }
    }

    if (!user) {
      res.status(401);
      throw new Error('Not authorised, user not found');
    }

    req.user = user;
    next();
  } catch (err) {
    if (res.statusCode === 200) res.status(401);
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
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-passwordHash');
      } catch {
        try {
          const decodedFb = await verifyFirebaseIdToken(token);
          if (decodedFb?.uid) {
            req.user = await User.findOne({
              $or: [{ firebaseUid: decodedFb.uid }, { email: decodedFb.email?.toLowerCase() }],
            }).select('-passwordHash');
          }
        } catch {
          req.user = null;
        }
      }
    }
  } catch (err) {
    req.user = null;
  }
  next();
};
