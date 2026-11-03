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
