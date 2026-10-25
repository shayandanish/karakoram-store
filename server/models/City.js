import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    slug:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, default: '' },
    body:    { type: String, required: true },   // rich intro / description
    image: {
      url:      { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    // Carousel display options
    accentColor: { type: String, default: '#f89535' },  // CSS hex for CTA / pill
    gradient:    { type: String, default: 'from-mountain-900 via-mountain-800 to-mountain-700' },
    order:       { type: Number, default: 0 },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('City', citySchema);
