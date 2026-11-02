import mongoose from 'mongoose';

const supplierPaymentSchema = new mongoose.Schema(
  {
    purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPurchase', required: true },
    kind: { type: String, enum: ['payment', 'reversal'], default: 'payment' },
    amountMinor: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true },
    method: { type: String, default: '', trim: true, maxlength: 60 },
    reference: { type: String, default: '', trim: true, maxlength: 120 },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplierPayment', default: null },
    reversalRevision: { type: Number, default: 0, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

supplierPaymentSchema.index({ purchase: 1, paymentDate: -1 });
supplierPaymentSchema.index({ reversalOf: 1 });

export default mongoose.model('SupplierPayment', supplierPaymentSchema);
