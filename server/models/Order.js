import mongoose from 'mongoose';

// Snapshot of the item at time of purchase
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  variantLabel: { type: String, required: true },
  price: { type: Number, required: true }, // PKR, server-calculated
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' },
});

const addressSchema = new mongoose.Schema({
  name: String,
  phone: String,
  street: String,
  city: String,
  province: String,
  postalCode: String,
  country: { type: String, default: 'Pakistan' },
});

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  note: { type: String, default: '' },
  changedBy: { type: String, default: 'System' },
}, { _id: true });

const shipmentSchema = new mongoose.Schema({
  courierName: { type: String, default: '' },
  trackingId: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  shippedAt: { type: Date },
  estimatedDelivery: { type: Date },
}, { _id: false });

const notificationLogSchema = new mongoose.Schema({
  type: { type: String, enum: ['email', 'whatsapp'], required: true },
  event: { type: String, required: true },
  recipient: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
  success: { type: Boolean, default: true },
  error: { type: String, default: '' },
  messageId: { type: String, default: '' },
}, { _id: true });

const orderSchema = new mongoose.Schema(
  {
    // Unique human-readable Order ID (e.g. KS-2026-001001)
    orderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    // Optional: null for guest orders
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Guest contact (required when user is null)
    guestName: String,
    guestEmail: String,
    guestPhone: String,

    items: [orderItemSchema],
    shippingAddress: { type: addressSchema, required: true },

    paymentMethod: {
      type: String,
      enum: ['easypaisa', 'COD', 'bank_transfer'],
      default: 'easypaisa',
      required: true,
    },
    transactionId: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    // 9 Standard E-Commerce Order Lifecycle Statuses
    orderStatus: {
      type: String,
      enum: [
        'pending',           // 1. Order Placed
        'confirmed',         // 2. Order Confirmed
        'processing',        // 3. Processing
        'packed',            // 4. Packed
        'shipped',           // 5. Shipped
        'out_for_delivery',  // 6. Out for Delivery
        'delivered',         // 7. Delivered
        'cancelled',         // 8. Cancelled
        'returned',          // 9. Returned
      ],
      default: 'pending',
      index: true,
    },

    // Audit log of status transitions
    statusHistory: [statusHistorySchema],

    // Courier and shipment logistics
    shipment: {
      type: shipmentSchema,
      default: () => ({}),
    },

    // Log of all dispatched customer notifications (email / WhatsApp)
    notificationLog: [notificationLogSchema],

    // Customer communication preferences & WhatsApp consent
    whatsappConsent: { type: Boolean, default: true },
    whatsappPhone: { type: String, default: '' },

    // Automated 24-hour payment reminder tracking
    paymentReminderCount: { type: Number, default: 0 },
    lastPaymentReminderAt: { type: Date, default: null },

    // Payment proof screenshot uploaded by customer (Cloudinary URL)
    paymentScreenshot: { type: String, default: '' },
    paymentScreenshotUploadedAt: { type: Date, default: null },

    // Server-calculated totals in PKR
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    couponCode: { type: String, default: '' },
    notes: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field `status` for backward compatibility
orderSchema.virtual('status')
  .get(function () {
    return this.orderStatus;
  })
  .set(function (val) {
    this.orderStatus = val;
  });

// Virtual for courier tracking number alias
orderSchema.virtual('trackingNumber')
  .get(function () {
    return this.shipment?.trackingId || '';
  })
  .set(function (val) {
    if (!this.shipment) this.shipment = {};
    this.shipment.trackingId = val;
  });

orderSchema.index({ guestEmail: 1 });
orderSchema.index({ guestPhone: 1 });
orderSchema.index({ 'shippingAddress.phone': 1 });
orderSchema.index({ createdAt: -1 });

export default mongoose.model('Order', orderSchema);
