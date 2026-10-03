import mongoose from 'mongoose';

const artisanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    village: { type: String, trim: true },
    story: { type: String, trim: true },
    photo: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Artisan', artisanSchema);
