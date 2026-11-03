import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      enum: ['easypaisa', 'jazzcash', 'bank_transfer', 'cod', 'other'],
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    enabled: { type: Boolean, default: false },
    accountName: { type: String, default: '', trim: true, maxlength: 120 },
    accountNumber: { type: String, default: '', trim: true, maxlength: 120 },
    instructions: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const deliveryZoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    cities: { type: [String], default: [] },
    provinces: { type: [String], default: [] },
    shippingFee: { type: Number, required: true, min: 0, max: 100000 },
    minDays: { type: Number, required: true, min: 1, max: 60 },
    maxDays: { type: Number, required: true, min: 1, max: 60 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    // Singleton key. There should only ever be one document.
    key: {
      type: String,
      default: 'site',
      unique: true,
      immutable: true,
    },
    logo: {
      url: { type: String, default: '', trim: true },
      publicId: { type: String, default: '', trim: true },
      alt: { type: String, default: 'Karakoram Store', trim: true },
    },
    storeName: {
      type: String,
      default: 'Karakoram Store',
      trim: true,
      maxlength: 120,
    },
    storeTagline: {
      type: String,
      default: 'Authentic · Gilgit-Baltistan · Pakistan',
      trim: true,
      maxlength: 160,
    },
    storeDescription: {
      type: String,
      default: 'Handcrafted goods and artisan products from Gilgit-Baltistan, Pakistan.',
      trim: true,
      maxlength: 500,
    },
    shippingFee: {
      type: Number,
      default: 200,
      min: 0,
    },
    deliveryMinDays: { type: Number, default: 2, min: 1, max: 60 },
    deliveryMaxDays: { type: Number, default: 5, min: 1, max: 60 },
    deliveryZones: { type: [deliveryZoneSchema], default: [] },
    easypaisaAccountName: {
      type: String,
      default: 'Shayan Danish',
      trim: true,
    },
    easypaisaAccountNumber: {
      type: String,
      default: '03495144486',
      trim: true,
    },
    enableEasypaisa: {
      type: Boolean,
      default: true,
    },
    paymentMethods: {
      type: [paymentMethodSchema],
      default: undefined,
    },
    bankTransferDetails: {
      type: String,
      default: '',
      trim: true,
    },
    whatsappNumber: {
      type: String,
      default: '923495144486',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '+923495144486',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: 'hello@karakoramstore.com',
      trim: true,
    },
    enableCustomerWhatsApp: {
      type: Boolean,
      default: false,
    },
    enableCod: {
      type: Boolean,
      default: true,
    },
    enableBankTransfer: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Fetch the single settings document, creating it on first use.
 * The upsert keeps concurrent first requests from creating duplicates.
 */
siteSettingsSchema.statics.getSingleton = function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'site' },
    { $setOnInsert: { key: 'site' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model('SiteSettings', siteSettingsSchema);
