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

// ── Cloudinary thumbnail URL ──────────────────────────────────
export const thumbUrl = (url, w = 400) => {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!url || !cloud) return url;
  // Insert transformation before /upload/ in Cloudinary URLs
  return url.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`);
};

