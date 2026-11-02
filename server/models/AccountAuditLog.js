import mongoose from 'mongoose';

const accountAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, maxlength: 80 },
    entity: { type: String, required: true, maxlength: 80 },
    entityId: { type: String, default: '', maxlength: 80 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false }
);

accountAuditLogSchema.index({ occurredAt: -1 });
accountAuditLogSchema.index({ actor: 1, occurredAt: -1 });

export default mongoose.model('AccountAuditLog', accountAuditLogSchema);
