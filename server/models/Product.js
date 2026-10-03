import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true },   // e.g. "250g", "500g", "Large"
  price: { type: Number, required: true },   // PKR
  stock: { type: Number, required: true, default: 0 },
});

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  alt: { type: String, default: '' },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', default: null },
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
  },
  { timestamps: true }
);

// Indexes for performance and text search (slug is already indexed via unique:true)
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
