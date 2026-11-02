import mongoose from 'mongoose';

const accountExpenseSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['expense', 'reversal'], default: 'expense' },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    amountMinor: { type: Number, required: true, min: 1 },
    expenseDate: { type: Date, required: true },
    reference: { type: String, default: '', trim: true, maxlength: 120 },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountExpense', default: null },
    reversalRevision: { type: Number, default: 0, select: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

accountExpenseSchema.index({ expenseDate: -1 });
accountExpenseSchema.index({ reversalOf: 1 });

export default mongoose.model('AccountExpense', accountExpenseSchema);
