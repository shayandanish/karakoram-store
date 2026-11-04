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

const deliveryZoneSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  cities: z.array(z.string().trim().min(1).max(100)).max(50),
  provinces: z.array(z.string().trim().min(1).max(100)).max(20),
  shippingFee: z.number().min(0).max(100000),
  minDays: z.number().int().min(1).max(60),
  maxDays: z.number().int().min(1).max(60),
  enabled: z.boolean(),
}).refine(
  (zone) => zone.cities.length > 0 || zone.provinces.length > 0,
  'Each delivery zone needs at least one city or province'
).refine(
  (zone) => zone.minDays <= zone.maxDays,
  'Maximum delivery days must be greater than or equal to minimum delivery days'
);

const settingsSchema = z.object({
  logo: logoSchema.optional(),
  storeName: z.string().trim().min(1).max(120).optional(),
  storeTagline: z.string().trim().max(160).optional(),
  storeDescription: z.string().trim().max(500).optional(),
  pageContent: z.object({
    home: z.object({ heroTitle: z.string().trim().max(160), heroDescription: z.string().trim().max(500), heroButton: z.string().trim().min(1).max(80), categoryTitle: z.string().trim().max(100), featuredTitle: z.string().trim().max(100), sectionOrder: z.array(z.enum(['hero','categories','featured','promises','regions'])).length(5).optional(), visibility: z.object({ categories: z.boolean(), featured: z.boolean(), promises: z.boolean(), regions: z.boolean() }).optional() }).optional(),
    about: z.object({ intro: z.string().trim().max(500), story: z.string().trim().max(3000), sections: z.array(z.object({ heading: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(3000), imageUrl: z.string().trim().max(2048).optional().default(''), imageAlt: z.string().trim().max(160).optional().default('') })).max(8).optional(), founders: z.array(z.object({ name: z.string().trim().min(1).max(100), role: z.string().trim().min(1).max(60) })).max(10), seoTitle: z.string().trim().max(120).optional(), seoDescription: z.string().trim().max(300).optional() }).optional(),
    contact: z.object({ intro: z.string().trim().max(500), responseText: z.string().trim().max(300), seoTitle: z.string().trim().max(120), seoDescription: z.string().trim().max(300) }).optional(),
    footer: z.object({ intro: z.string().trim().max(300), newsletterText: z.string().trim().max(300), contactEmail: z.string().trim().email().max(160).or(z.literal('')).optional(), whatsappNumber: z.string().trim().max(40).optional(), location: z.string().trim().max(300).optional(), mapUrl: z.string().trim().url().max(1000).or(z.literal('')).optional(), socialLinks: z.array(z.object({ label: z.string().trim().max(40), url: z.string().trim().url().max(500) })).max(8) }).optional(),
  }).optional(),
  shippingFee: z.number().min(0).max(100000).optional(),
  deliveryMinDays: z.number().int().min(1).max(60).optional(),
  deliveryMaxDays: z.number().int().min(1).max(60).optional(),
  deliveryZones: z.array(deliveryZoneSchema).max(50).optional().refine(
    (zones) => !zones || new Set(zones.map((zone) => zone.id)).size === zones.length,
    'Delivery zone IDs must be unique'
  ),
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
  pageContent: settings.pageContent || {},
  shippingFee: Number.isFinite(settings.shippingFee) ? settings.shippingFee : 200,
  deliveryMinDays: Number.isInteger(settings.deliveryMinDays) ? settings.deliveryMinDays : 2,
  deliveryMaxDays: Number.isInteger(settings.deliveryMaxDays) ? settings.deliveryMaxDays : 5,
  deliveryZones: (settings.deliveryZones || []).map((zone) => ({
    id: zone.id,
    name: zone.name,
    cities: zone.cities || [],
    provinces: zone.provinces || [],
    shippingFee: zone.shippingFee,
    minDays: zone.minDays,
    maxDays: zone.maxDays,
    enabled: zone.enabled,
  })),
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
    if (req.user?.role !== 'admin') {
      const allowedFields = new Set(['logo', 'pageContent', 'contactEmail', 'whatsappNumber']);
      const restrictedField = Object.keys(data).find((field) => !allowedFields.has(field));
      if (restrictedField) {
        res.status(403);
        throw new Error('Only administrators can change store operations and payment settings.');
      }
    }

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
      'pageContent',
      'shippingFee',
      'deliveryMinDays',
      'deliveryMaxDays',
      'deliveryZones',
      'whatsappNumber',
      'contactPhone',
      'contactEmail',
      'enableCustomerWhatsApp',
      'enableEasypaisa',
    ];

    for (const field of scalarFields) {
      if (data[field] !== undefined) settings[field] = data[field];
    }

    if (settings.deliveryMinDays > settings.deliveryMaxDays) {
      res.status(400);
      throw new Error('Maximum delivery days must be greater than or equal to minimum delivery days.');
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
