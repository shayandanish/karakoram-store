import mongoose from 'mongoose';

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
