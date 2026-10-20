import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    group: { type: String, default: 'General' }, // e.g. "Mountain Harvest & Pantry", "Artisanal Living & Handicrafts"
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    order: { type: Number, default: 0 },
    image: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
