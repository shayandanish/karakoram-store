const DEFAULT_SITE_URL = 'https://karakoram-store.vercel.app';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const resolveImageUrl = (image, siteUrl) => {
  try {
    const url = new URL(image, siteUrl);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  if (!/^[a-z0-9][a-z0-9-]{0,119}$/i.test(slug)) {
    return res.status(400).send('Invalid product slug');
  }

  const apiBase = process.env.VITE_API_URL || process.env.API_BASE_URL;
  if (!apiBase) {
    return res.status(503).send('Product preview API is not configured');
  }

  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const siteUrl = process.env.SITE_URL || (host ? `${protocol}://${host}` : DEFAULT_SITE_URL);

  let response;
  try {
    const endpoint = new URL(`products/${encodeURIComponent(slug)}`, `${apiBase.replace(/\/+$/, '')}/`);
    response = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
  } catch {
    return res.status(502).send('Product preview could not be loaded');
  }
  if (response.status === 404) return res.status(404).send('Product not found');
  if (!response.ok) return res.status(502).send('Product preview could not be loaded');

  let product;
  try {
    const payload = await response.json();
    product = payload.product || payload;
  } catch {
    return res.status(502).send('Product preview returned invalid data');
  }

  if (!product?.name || !product.slug) {
    return res.status(502).send('Product preview returned incomplete data');
  }

  const title = `${product.name} | Karakoram Store`;
  const description = String(product.description || 'Authentic products from the Karakoram mountains.').slice(0, 300);
  const canonicalUrl = new URL(`/products/${encodeURIComponent(product.slug)}`, siteUrl).href;
  const image = resolveImageUrl(product.images?.[0]?.url, siteUrl) ||
    new URL('/regions/hunza-960.webp', siteUrl).href;
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedImage = escapeHtml(image);
  const escapedCanonical = escapeHtml(canonicalUrl);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapedTitle}</title>
<meta name="description" content="${escapedDescription}">
<link rel="canonical" href="${escapedCanonical}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Karakoram Store">
<meta property="og:title" content="${escapedTitle}">
<meta property="og:description" content="${escapedDescription}">
<meta property="og:url" content="${escapedCanonical}">
<meta property="og:image" content="${escapedImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapedTitle}">
<meta name="twitter:description" content="${escapedDescription}">
<meta name="twitter:image" content="${escapedImage}">
</head>
<body><a href="${escapedCanonical}">${escapedTitle}</a></body>
</html>`);
}
