/**
 * CSRF protection middleware — double-submit cookie pattern.
 *
 * For state-changing methods (POST, PUT, PATCH, DELETE), the client must send
 * an `X-CSRF-Token` header whose value matches the `csrf_token` cookie.
 * Safe methods (GET, HEAD, OPTIONS) are exempt.
 *
 * Because the storefront and API are often on different origins, the token is
 * also exposed via the `X-CSRF-Token` response header so the SPA can store and
 * echo it (JS cannot read cross-origin cookies via document.cookie).
 */
import crypto from 'crypto';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false, // readable same-origin; cross-origin clients use the response header
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function ensureCsrfToken(req, res, cookieName) {
  let token = req.cookies?.[cookieName];
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(cookieName, token, csrfCookieOptions());
  }
  res.setHeader('X-CSRF-Token', token);
  // Expose header to browser JS under CORS
  res.setHeader('Access-Control-Expose-Headers', 'X-CSRF-Token, X-Response-Time');
  return token;
}

export const csrfProtection = (options = {}) => {
  const { cookieName = 'csrf_token', headerName = 'x-csrf-token', skip } = options;

  return (req, res, next) => {
    if (skip && skip(req)) {
      ensureCsrfToken(req, res, cookieName);
      return next();
    }

    if (!STATE_CHANGING.has(req.method)) {
      ensureCsrfToken(req, res, cookieName);
      return next();
    }

    const cookieToken = req.cookies?.[cookieName];
    const headerToken = req.headers[headerName];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403);
      return next(new Error('CSRF token missing or mismatched'));
    }

    ensureCsrfToken(req, res, cookieName);
    next();
  };
};
