import mongoose from 'mongoose';

const accountAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 80 },
    entity: { type: String, required: true, maxlength: 80 },
    entityId: { type: String, default: '', maxlength: 80 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, immutable: true },
    verified: { type: Boolean, default: false, index: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    verifiedByName: { type: String, default: '', trim: true },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: false }
);

accountAuditLogSchema.index({ occurredAt: -1 });
accountAuditLogSchema.index({ actor: 1, occurredAt: -1 });
accountAuditLogSchema.index({ verified: 1, occurredAt: -1 });

export default mongoose.model('AccountAuditLog', accountAuditLogSchema);
