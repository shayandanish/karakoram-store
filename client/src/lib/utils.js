// ── Price formatter ───────────────────────────────────────────
export const fmtPKR = (amount) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

// ── Date formatter ────────────────────────────────────────────
export const fmtDate = (date) =>
  new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

// ── WhatsApp order link builder ───────────────────────────────
const DEFAULT_WHATSAPP_NUMBER = '923495144486';

export const getCleanWhatsAppNumber = () => {
  const raw = import.meta.env.VITE_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
  return raw.replace(/\D/g, '');
};

export const buildWhatsAppLink = (items, total) => {
  const number = getCleanWhatsAppNumber();
  const lines = items.map(
    (i) => `• ${i.productName} (${i.variantLabel}) × ${i.quantity} = ${fmtPKR(i.price * i.quantity)}`
  );
  const msg =
    `*Order from Karakoram Store*\n\n` +
    lines.join('\n') +
    `\n\n*Subtotal:* ${fmtPKR(total)}\n\nPlease confirm my order.`;
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
};

export const buildProductWhatsAppLink = (product, variant, quantity = 1) => {
  const number = getCleanWhatsAppNumber();
  const total = (variant?.price || 0) * quantity;
  const msg =
    `*Inquiry from Karakoram Store*\n\n` +
    `• Product: *${product?.name || ''}*\n` +
    `• Variant: ${variant?.label || ''}\n` +
    `• Quantity: ${quantity}\n` +
    `• Price: ${fmtPKR(total)}\n\n` +
    `I would like to order this. Please let me know how to proceed.`;
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
};

// ── Phone helpers (Pakistan-aware) ────────────────────────────
/**
 * Normalize a phone number for WhatsApp/E.164 use without the leading "+".
 * Accepts 03XX XXXXXXX, +92 3XX XXXXXXX, 0092…, 923… and international numbers.
 * Returns '' when the input cannot be a usable number.
 */
export const normalizePkPhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0092')) digits = digits.slice(4);
  if (digits.startsWith('92') && digits.length >= 12) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `92${digits.slice(1)}`;
  if (digits.startsWith('3') && digits.length === 10) return `92${digits}`;

  return digits.length >= 10 ? digits : '';
};

/** Format a phone number for display: 923495144486 -> 0349 5144486. */
export const formatPhoneDisplay = (value) => {
  const normalized = normalizePkPhone(value);
  if (!normalized) return String(value || '').trim();
  if (normalized.startsWith('92') && normalized.length === 12) {
    const local = `0${normalized.slice(2)}`;
    return `${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return `+${normalized}`;
};


// ── Cloudinary image helpers ──────────────────────────────────
// Cloudinary URLs already contain the cloud name, so transformations work
// even when VITE_CLOUDINARY_CLOUD_NAME is not present at build time.
const CLOUDINARY_UPLOAD_PATH = '/image/upload/';

export const isCloudinaryUrl = (url) =>
  typeof url === 'string' && url.includes(CLOUDINARY_UPLOAD_PATH);

const buildTransformation = ({
  width,
  height,
  crop,
  gravity,
  quality,
  format,
  dpr,
  blur,
}) =>
  [
    width && `w_${Math.round(width)}`,
    height && `h_${Math.round(height)}`,
    crop && `c_${crop}`,
    gravity && `g_${gravity}`,
    blur && `e_blur:${blur}`,
    quality && `q_${quality}`,
    format && `f_${format}`,
    dpr && 'dpr_auto',
  ]
    .filter(Boolean)
    .join(',');

/**
 * Add a Cloudinary transformation to an existing upload URL.
 * Non-Cloudinary URLs are returned unchanged.
 */
export const cloudinaryImage = (url, options = {}) => {
  if (!isCloudinaryUrl(url)) return url;

  const transformation = buildTransformation(options);
  if (!transformation) return url;

  const [base, rest] = url.split(CLOUDINARY_UPLOAD_PATH);
  // Replace any existing transformation segment while preserving the version.
  const versionMatch = rest.match(/^(?:[^/]+\/)?(v\d+\/.*)$/);
  const assetPath = versionMatch ? versionMatch[1] : rest;

  return `${base}${CLOUDINARY_UPLOAD_PATH}${transformation}/${assetPath}`;
};

/**
 * Build a responsive Cloudinary srcset. Returns undefined for local images so
 * the browser simply uses the normal src attribute.
 */
export const cloudinarySrcSet = (url, widths, options = {}) => {
  if (!isCloudinaryUrl(url)) return undefined;

  return widths
    .filter(Boolean)
    .map((width) => {
      const height = options.ratio
        ? Math.round(width / options.ratio)
        : options.height;
      return `${cloudinaryImage(url, { ...options, width, height })} ${width}w`;
    })
    .join(', ');
};

