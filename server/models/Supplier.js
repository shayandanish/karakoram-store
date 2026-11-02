import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contactName: { type: String, default: '', trim: true, maxlength: 120 },
    email: { type: String, default: '', lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: 1 });
supplierSchema.index({ isActive: 1, name: 1 });

export default mongoose.model('Supplier', supplierSchema);
