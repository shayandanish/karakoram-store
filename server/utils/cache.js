// Cache public catalog/branding responses at the Vercel edge. This keeps the
// first image/API request fast for every visitor instead of hitting the
// serverless function and MongoDB on each page load.
export const setPublicCache = (res, maxAge = 60, staleWhileRevalidate = 300) => {
  if (process.env.NODE_ENV === 'development') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return;
  }
  res.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
};
