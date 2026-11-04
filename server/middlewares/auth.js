import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { verifyFirebaseIdToken } from '../utils/firebaseAdmin.js';

const unverifiedError = () => {
  const err = new Error('Please verify your email address before continuing.');
  err.statusCode = 403;
  err.code = 'EMAIL_NOT_VERIFIED';
  return err;
};

/**
 * Resolve the MongoDB user behind a Firebase token. An unverified email is
 * rejected so a lingering Firebase client session cannot bypass the
 * verification gate. `email_verified` can be stale until the client refreshes
 * its ID token, so a record activated by the admin is accepted too.
 */
const findVerifiedFirebaseUser = async (decodedFb) => {
  const user = await User.findOne({
    $or: [{ firebaseUid: decodedFb.uid }, { email: decodedFb.email?.toLowerCase() }],
  }).select('-passwordHash');

  if (!user) return null;

  const verified =
    decodedFb.email_verified === true ||
    user.role === 'admin' ||
    user.isVerified === true ||
    user.status === 'verified';

  if (!verified) throw unverifiedError();

  return user;
};

/** Every token the client supplied, most explicit (header) first. */
const collectTokens = (req) => {
  const tokens = [];
  if (req.headers.authorization?.startsWith('Bearer ')) {
    tokens.push(req.headers.authorization.split(' ')[1]);
  }
  if (req.cookies?.token) tokens.push(req.cookies.token);
  return tokens;
};

/** Resolve a single token to a user; throws when it is invalid or unverified. */
const resolveTokenUser = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.principalType === 'staff') {
      const staff = await Staff.findById(decoded.id).select('+authVersion');
      if (!staff?.isActive || staff.authVersion !== decoded.staffAuthVersion) return null;
      const staffUser = staff.toObject();
      delete staffUser.passwordHash;
      delete staffUser.authVersion;
      staffUser._authType = 'staff';
      return staffUser;
    }
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user) return user;
  } catch {
    // Not one of our JWTs — try it as a Firebase ID token below.
  }

  const decodedFb = await verifyFirebaseIdToken(token);
  if (!decodedFb?.uid) return null;
  return findVerifiedFirebaseUser(decodedFb);
};

/** Protect route — requires valid JWT in httpOnly cookie or Authorization Bearer header */
export const protect = async (req, res, next) => {
  try {
    const tokens = collectTokens(req);
    if (tokens.length === 0) {
      res.status(401);
      throw new Error('Not authorised, no token');
    }

    let lastError;

    // A stale cookie must not shadow a valid Authorization header, so try each.
    for (const token of tokens) {
      try {
        const user = await resolveTokenUser(token);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        lastError = err;
      }
    }

    res.status(lastError?.statusCode || 401);
    throw lastError || new Error('Not authorised, user not found');
  } catch (err) {
    if (res.statusCode === 200) res.status(err.statusCode || 401);
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

const ADMIN_ROLE_PERMISSIONS = {
  admin: ['dashboard', 'orders', 'catalog', 'accounts', 'content', 'users'],
  orders_manager: ['dashboard', 'orders'],
  catalog_manager: ['dashboard', 'catalog'],
  accounts_manager: ['dashboard', 'accounts'],
  content_manager: ['dashboard', 'content'],
};

export const hasAdminPermission = (user, permission) =>
  Boolean(ADMIN_ROLE_PERMISSIONS[user?.role]?.includes(permission));

export const adminStaffOnly = (req, res, next) => {
  if (!ADMIN_ROLE_PERMISSIONS[req.user?.role]) {
    res.status(403);
    return next(new Error('Administrative staff access required'));
  }
  next();
};

export const requireAdminPermission = (permission) => (req, res, next) => {
  if (!hasAdminPermission(req.user, permission)) {
    res.status(403);
    return next(new Error(`You do not have permission to access ${permission}.`));
  }
  next();
};

export const requireAnyAdminPermission = (...permissions) => (req, res, next) => {
  if (!permissions.some((permission) => hasAdminPermission(req.user, permission))) {
    res.status(403);
    return next(new Error('You do not have permission to access this resource.'));
  }
  next();
};

/** Optional auth — attaches req.user if a valid token is present, but allows guests */
export const optionalAuth = async (req, res, next) => {
  try {
    for (const token of collectTokens(req)) {
      try {
        const user = await resolveTokenUser(token);
        if (user) {
          req.user = user;
          break;
        }
      } catch {
        // Ignore invalid tokens for optional auth
      }
    }
  } catch (err) {
    req.user = null;
  }
  next();
};
