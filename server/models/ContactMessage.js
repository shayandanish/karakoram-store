import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, default: '', trim: true, maxlength: 30 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new', index: true },
  replies: [{
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: String, default: '', maxlength: 120 },
  }],
}, { timestamps: true });

contactMessageSchema.index({ createdAt: -1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
