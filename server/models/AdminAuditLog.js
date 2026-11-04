import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, default: '', maxlength: 120 },
  actorEmail: { type: String, default: '', maxlength: 254 },
  actorUsername: { type: String, default: '', maxlength: 32 },
  actorRole: { type: String, required: true, maxlength: 40 },
  action: { type: String, required: true, maxlength: 80 },
  resource: { type: String, required: true, maxlength: 80 },
  resourceId: { type: String, default: '', maxlength: 80 },
  method: { type: String, required: true, maxlength: 10 },
  path: { type: String, required: true, maxlength: 300 },
  statusCode: { type: Number, required: true },
  changedFields: [{ type: String, maxlength: 120 }],
  occurredAt: { type: Date, default: Date.now, immutable: true },
}, { timestamps: false });

adminAuditLogSchema.index({ occurredAt: -1 });
adminAuditLogSchema.index({ actor: 1, occurredAt: -1 });
adminAuditLogSchema.index({ resource: 1, occurredAt: -1 });

export default mongoose.model('AdminAuditLog', adminAuditLogSchema);
