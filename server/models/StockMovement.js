import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    variantLabel: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'goods_received',
        'damage_loss',
        'physical_count_correction',
        'internal_use',
        'purchase_bill',
        'order_sale',
        'order_cancelled',
        'warehouse_to_store',   // Transfer from warehouse/godown to store shelf
        'packaging_production', // Finished product created from raw materials
      ],
      required: true,
      index: true,
    },
    quantityChange: { type: Number, required: true },
    stockBefore: { type: Number, required: true, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '', trim: true, maxlength: 300 },
    reference: { type: String, default: '', trim: true, maxlength: 120 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
