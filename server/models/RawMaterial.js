import mongoose from 'mongoose';

const rawMaterialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 60 },
    type: {
      type: String,
      enum: ['raw_material', 'packaging_material'],
      default: 'raw_material',
      index: true,
    },
    category: { type: String, default: 'General', trim: true, maxlength: 100 },
    unit: {
      type: String,
      enum: ['kg', 'g', 'pcs', 'liter', 'box', 'meter'],
      required: true,
      default: 'kg',
    },
    currentStock: { type: Number, default: 0, min: 0 },
    averageCostMinor: { type: Number, default: 0, min: 0 }, // Weighted-average cost per base unit in paisa
    latestUnitCostMinor: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    primarySupplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

rawMaterialSchema.index({ name: 'text', sku: 'text' });
rawMaterialSchema.index({ type: 1, isActive: 1 });
rawMaterialSchema.index({ category: 1 });

export default mongoose.model('RawMaterial', rawMaterialSchema);
