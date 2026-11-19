import mongoose from 'mongoose';

const costBreakdownSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    amountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseAdditionalCostSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    amountMinor: { type: Number, required: true, min: 0 },
    allocationMethod: { type: String, enum: ['quantity', 'value', 'equal'], default: 'quantity' },
  },
  { _id: false }
);

const purchaseLineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    variantLabel: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCostMinor: { type: Number, required: true, min: 0 },
    additionalCostMinor: { type: Number, default: 0, min: 0 },
    landedUnitCostMinor: { type: Number, default: null, min: 0 },
    costBreakdown: { type: [costBreakdownSchema], default: [] },
    stockBefore: { type: Number, required: true, min: 0 },
    warehouseStockBefore: { type: Number, default: 0, min: 0 },
    averageCostBeforeMinor: { type: Number, default: null, min: 0 },
    stockAfter: { type: Number, required: true, min: 0 },
    warehouseStockAfter: { type: Number, default: 0, min: 0 },
    averageCostAfterMinor: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const inventoryPurchaseSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    supplierName: { type: String, required: true, trim: true },
    reference: { type: String, default: '', trim: true, maxlength: 120 },
    purchaseDate: { type: Date, required: true },
    dueDate: { type: Date, default: null },
    kind: { type: String, enum: ['purchase', 'opening_stock', 'adjustment', 'reversal'], default: 'purchase' },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPurchase', default: null },
    lines: { type: [purchaseLineSchema], required: true, validate: [(lines) => lines.length > 0, 'At least one line is required'] },
    additionalCosts: { type: [purchaseAdditionalCostSchema], default: [] },
    totalCostMinor: { type: Number, required: true, min: 0 },
    amountPaidMinor: { type: Number, required: true, min: 0 },
    paymentRevision: { type: Number, default: 0, select: false },
    paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], required: true },
    notes: { type: String, default: '', trim: true, maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

inventoryPurchaseSchema.index({ purchaseDate: -1 });
inventoryPurchaseSchema.index({ supplier: 1, purchaseDate: -1 });
inventoryPurchaseSchema.index(
  { reversalOf: 1 },
  { unique: true, partialFilterExpression: { reversalOf: { $type: 'objectId' } } }
);

export default mongoose.model('InventoryPurchase', inventoryPurchaseSchema);
