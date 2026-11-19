import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  label:          { type: String, required: true },  // e.g. "250g", "500g", "Large"
  price:          { type: Number, required: true },  // PKR - actual checkout price
  stock:          { type: Number, required: true, default: 0, min: 0 }, // Store shelf stock (sellable)
  warehouseStock: { type: Number, default: 0, min: 0 },                  // Warehouse / godown stock
  averageCostMinor: { type: Number, default: null, min: 0, select: false }, // weighted-average cost in paisa
  latestUnitCostMinor: { type: Number, default: null, min: 0 },            // raw supplier unit cost in paisa
  latestLandedCostMinor: { type: Number, default: null, min: 0 },          // total landed cost per unit in paisa
  targetMarkupPercent: { type: Number, default: null, min: 0 },            // desired markup % (e.g. 25%)
  minMarginPercent: { type: Number, default: null, min: 0 },               // minimum profit margin % threshold
  discountPercent: { type: Number, default: null, min: 0, max: 99 },
  compareAtPrice:  { type: Number, default: null },   // original "was" price; null = no discount
  discountLabel:  { type: String, default: '' },     // optional badge e.g. "Eid Sale"
});

const imageSchema = new mongoose.Schema({
  url:          { type: String, required: true },
  publicId:     { type: String, default: '' },
  alt:          { type: String, default: '' },
  isPrimary:    { type: Boolean, default: false },
  description:  { type: String, default: '' },
  variantLabel: { type: String, default: '' },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', default: null },
    primarySupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    description: { type: String, required: true },
    images: [imageSchema],
    video: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    variants: [variantSchema],
    origin: { type: String, default: 'Hunza, Gilgit-Baltistan' },
    isSeasonal: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0, min: 0 },
    seoTitle: { type: String, default: '', trim: true, maxlength: 120 },
    seoDescription: { type: String, default: '', trim: true, maxlength: 320 },
  },
  { timestamps: true }
);

// Indexes for performance and text search (slug is already indexed via unique:true)
productSchema.index({ category: 1 });
productSchema.index({ primarySupplier: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ totalSold: -1 });
productSchema.index({ ratingAverage: -1 });
productSchema.index({ origin: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isSeasonal: 1 });
productSchema.index({ isActive: 1, totalSold: -1 });
productSchema.index({ isActive: 1, category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });

export default mongoose.model('Product', productSchema);
