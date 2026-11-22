import mongoose from 'mongoose';

const rawMaterialInputSchema = new mongoose.Schema(
  {
    rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    rawMaterialName: { type: String, required: true },
    unit: { type: String, required: true },
    quantityUsed: { type: Number, required: true, min: 0.001 },
    unitCostMinor: { type: Number, required: true, min: 0 },
    totalCostMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const packagingInputSchema = new mongoose.Schema(
  {
    packagingMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    packagingMaterialName: { type: String, required: true },
    unit: { type: String, default: 'pcs' },
    quantityUsed: { type: Number, required: true, min: 1 },
    unitCostMinor: { type: Number, required: true, min: 0 },
    totalCostMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productionBatchSchema = new mongoose.Schema(
  {
    batchNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    productionDate: { type: Date, required: true },
    targetProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    targetProductName: { type: String, required: true },
    targetVariantLabel: { type: String, required: true },
    outputQuantity: { type: Number, required: true, min: 1 }, // Finished packaged units (e.g. 80)
    rawMaterialInputs: [rawMaterialInputSchema],
    packagingInputs: [packagingInputSchema],
    labourCostMinor: { type: Number, default: 0, min: 0 },
    processingCostMinor: { type: Number, default: 0, min: 0 },
    otherExpensesMinor: { type: Number, default: 0, min: 0 },
    expenseNotes: { type: String, default: '', trim: true, maxlength: 500 },
    wasteQuantity: { type: Number, default: 0, min: 0 },
    wasteReason: { type: String, default: '', trim: true, maxlength: 300 },
    totalRawMaterialCostMinor: { type: Number, required: true, min: 0 },
    totalPackagingCostMinor: { type: Number, required: true, min: 0 },
    totalExpensesMinor: { type: Number, required: true, min: 0 },
    totalBatchCostMinor: { type: Number, required: true, min: 0 },
    costPerPackageMinor: { type: Number, required: true, min: 0 },
    sellingPriceSnapshot: { type: Number, default: null }, // Selling price at production time
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    status: { type: String, enum: ['completed', 'reversed'], default: 'completed', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

productionBatchSchema.index({ targetProduct: 1, productionDate: -1 });
productionBatchSchema.index({ productionDate: -1 });
productionBatchSchema.index({ batchNumber: 1 });

export default mongoose.model('ProductionBatch', productionBatchSchema);
