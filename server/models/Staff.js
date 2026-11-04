import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 32 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['orders_manager', 'catalog_manager', 'accounts_manager', 'content_manager'], required: true },
  isActive: { type: Boolean, default: true, index: true },
  authVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });

export default mongoose.model('Staff', staffSchema);
