import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../utils/firebaseAdmin.js';

const MAX_AUTH_AGE_SECONDS = 10 * 60;

export function hasRecentAdminMfa(claims, nowSeconds = Math.floor(Date.now() / 1000)) {
  const secondFactorVerified = claims?.adminMfaVerified === true
    || Boolean(claims?.firebase?.sign_in_second_factor);
  const authTime = claims?.adminAuthTime ?? claims?.auth_time;
  return secondFactorVerified
    && Number.isSafeInteger(authTime)
    && authTime <= nowSeconds + 60
    && nowSeconds - authTime <= MAX_AUTH_AGE_SECONDS;
}

const mfaRequired = () =>
  process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || process.env.ACCOUNTS_REQUIRE_MFA === 'true';

export const requireTrustedAccountsOrigin = (req, res, next) => {
  const origin = req.headers.origin?.replace(/\/+$/, '');
  if (!origin) return next();

  const allowedOrigins = new Set([
    'https://karakoram-store.vercel.app',
    ...(process.env.CLIENT_URL || '')
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  ]);
  const isDevelopmentLocalhost = process.env.NODE_ENV !== 'production'
    && !process.env.VERCEL
    && /^http:\/\/localhost:\d+$/.test(origin);

  if (allowedOrigins.has(origin) || isDevelopmentLocalhost) return next();

  res.set('Cache-Control', 'private, no-store');
  res.status(403);
  const error = new Error('This origin is not allowed to access Accounts.');
  error.code = 'ACCOUNTS_ORIGIN_DENIED';
  return next(error);
};

export const requireAccountsMfa = async (req, res, next) => {
  if (!mfaRequired()) return next();

  const tokens = [];
  if (req.headers.authorization?.startsWith('Bearer ')) {
    tokens.push(req.headers.authorization.slice(7));
  }
  if (req.cookies?.token) tokens.push(req.cookies.token);

  for (const token of tokens) {
    try {
      const claims = jwt.verify(token, process.env.JWT_SECRET);
      if (hasRecentAdminMfa(claims)) return next();
    } catch {
      try {
        const claims = await verifyFirebaseIdToken(token);
        if (hasRecentAdminMfa(claims)) return next();
      } catch {
        // Continue checking another credential; the protected admin middleware reports auth failures.
      }
    }
  }

  res.set('Cache-Control', 'private, no-store');
  res.status(403);
  const error = new Error('Accounts requires administrator MFA verified within the last 10 minutes.');
  error.code = 'ADMIN_MFA_REQUIRED';
  return next(error);
};
