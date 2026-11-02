import { z } from 'zod';
import SiteSettings from '../models/SiteSettings.js';
import { deleteStoredImage } from './uploadController.js';
import { PAYMENT_METHOD_DEFAULTS, resolvePaymentMethods } from '../utils/paymentMethods.js';

const DEFAULT_LOGO_ALT = 'Karakoram Store';

const logoSchema = z.object({
  url: z.string().trim().max(2048).optional().default(''),
  publicId: z.string().trim().max(512).optional().default(''),
  alt: z.string().trim().max(160).optional().default(DEFAULT_LOGO_ALT),
});

const paymentMethodSchema = z.object({
  id: z.enum(['easypaisa', 'jazzcash', 'bank_transfer', 'cod', 'other']),
  name: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
  accountName: z.string().trim().max(120).optional().default(''),
  accountNumber: z.string().trim().max(120).optional().default(''),
  instructions: z.string().trim().max(2000).optional().default(''),
});

const settingsSchema = z.object({
  logo: logoSchema.optional(),
  storeName: z.string().trim().min(1).max(120).optional(),
  storeTagline: z.string().trim().max(160).optional(),
  storeDescription: z.string().trim().max(500).optional(),
  shippingFee: z.number().min(0).max(100000).optional(),
  easypaisaAccountName: z.string().trim().max(120).optional(),
  easypaisaAccountNumber: z.string().trim().max(40).optional(),
  paymentMethods: z
    .array(paymentMethodSchema)
    .length(PAYMENT_METHOD_DEFAULTS.length)
    .refine(
      (methods) => new Set(methods.map((method) => method.id)).size === methods.length,
      'Payment methods must not contain duplicate IDs'
    )
    .optional(),
  bankTransferDetails: z.string().trim().max(2000).optional(),
  whatsappNumber: z.string().trim().max(40).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(160).or(z.literal('')).optional(),
  enableCustomerWhatsApp: z.boolean().optional(),
  enableEasypaisa: z.boolean().optional(),
  enableCod: z.boolean().optional(),
  enableBankTransfer: z.boolean().optional(),
});

export const serializeSettings = (settings) => ({
  logo: {
    url: settings.logo?.url || '',
    publicId: settings.logo?.publicId || '',
    alt:
      settings.logo?.alt && settings.logo.alt !== DEFAULT_LOGO_ALT
        ? settings.logo.alt
        : settings.storeName || DEFAULT_LOGO_ALT,
  },
  storeName: settings.storeName || 'Karakoram Store',
  storeTagline:
    typeof settings.storeTagline === 'string'
      ? settings.storeTagline
      : 'Authentic · Gilgit-Baltistan · Pakistan',
  storeDescription:
    typeof settings.storeDescription === 'string'
      ? settings.storeDescription
      : 'Handcrafted goods and artisan products from Gilgit-Baltistan, Pakistan.',
  shippingFee: Number.isFinite(settings.shippingFee) ? settings.shippingFee : 200,
  paymentMethods: resolvePaymentMethods(settings),
  easypaisaAccountName:
    resolvePaymentMethods(settings).find((method) => method.id === 'easypaisa')?.accountName ||
    settings.easypaisaAccountName ||
    'Shayan Danish',
  easypaisaAccountNumber:
    resolvePaymentMethods(settings).find((method) => method.id === 'easypaisa')?.accountNumber ||
    settings.easypaisaAccountNumber ||
    '03495144486',
  bankTransferDetails: settings.bankTransferDetails || '',
  whatsappNumber: settings.whatsappNumber || '923495144486',
  contactPhone: settings.contactPhone || '+923495144486',
  contactEmail: settings.contactEmail || 'hello@karakoramstore.com',
  enableCustomerWhatsApp: Boolean(settings.enableCustomerWhatsApp),
  enableEasypaisa: resolvePaymentMethods(settings).find((method) => method.id === 'easypaisa').enabled,
  enableCod: resolvePaymentMethods(settings).find((method) => method.id === 'cod').enabled,
  enableBankTransfer: resolvePaymentMethods(settings).find((method) => method.id === 'bank_transfer').enabled,
});

/* ── PUBLIC — GET /api/settings ─────────────────────────────── */
export const getSettings = async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];

    const settings = await SiteSettings.getSingleton();
    res.json(serializeSettings(settings));
  } catch (err) {
    next(err);
  }
};

/* ── ADMIN — PUT /api/admin/settings ───────────────────────── */
export const adminUpdateSettings = async (req, res, next) => {
  try {
    res.status(400);
    const data = settingsSchema.parse(req.body);

    const settings = await SiteSettings.getSingleton();
    const previousPublicId = settings.logo?.publicId || '';

    if (data.logo) {
      if (!data.logo.url) data.logo.publicId = '';
      settings.logo = data.logo;
    }

    const paymentMethods = data.paymentMethods
      ? data.paymentMethods
      : resolvePaymentMethods(settings).map((method) => ({ ...method }));

    if (!data.paymentMethods) {
      const easypaisa = paymentMethods.find((method) => method.id === 'easypaisa');
      const cod = paymentMethods.find((method) => method.id === 'cod');
      const bankTransfer = paymentMethods.find((method) => method.id === 'bank_transfer');
      if (data.enableEasypaisa !== undefined) easypaisa.enabled = data.enableEasypaisa;
      if (data.enableCod !== undefined) cod.enabled = data.enableCod;
      if (data.enableBankTransfer !== undefined) bankTransfer.enabled = data.enableBankTransfer;
      if (data.easypaisaAccountName !== undefined) easypaisa.accountName = data.easypaisaAccountName;
      if (data.easypaisaAccountNumber !== undefined) easypaisa.accountNumber = data.easypaisaAccountNumber;
      if (data.bankTransferDetails !== undefined) bankTransfer.instructions = data.bankTransferDetails;
    }

    const incompleteMethod = paymentMethods.find(
      (method) =>
        method.enabled &&
        method.id !== 'cod' &&
        !method.accountNumber &&
        !method.instructions
    );
    if (incompleteMethod) {
      res.status(400);
      throw new Error(
        `Add an account number or payment instructions before enabling ${incompleteMethod.name}.`
      );
    }

    settings.paymentMethods = paymentMethods;
    const easypaisa = paymentMethods.find((method) => method.id === 'easypaisa');
    const cod = paymentMethods.find((method) => method.id === 'cod');
    const bankTransfer = paymentMethods.find((method) => method.id === 'bank_transfer');
    settings.enableEasypaisa = easypaisa.enabled;
    settings.enableCod = cod.enabled;
    settings.enableBankTransfer = bankTransfer.enabled;
    settings.easypaisaAccountName = easypaisa.accountName;
    settings.easypaisaAccountNumber = easypaisa.accountNumber;
    settings.bankTransferDetails = bankTransfer.instructions;

    const scalarFields = [
      'storeName',
      'storeTagline',
      'storeDescription',
      'shippingFee',
      'whatsappNumber',
      'contactPhone',
      'contactEmail',
      'enableCustomerWhatsApp',
      'enableEasypaisa',
    ];

    for (const field of scalarFields) {
      if (data[field] !== undefined) settings[field] = data[field];
    }

    await settings.save();

    if (
      data.logo &&
      previousPublicId &&
      previousPublicId !== (data.logo.publicId || '')
    ) {
      await deleteStoredImage(previousPublicId);
    }

    res.status(200).json(serializeSettings(settings));
  } catch (err) {
    next(err);
  }
};
