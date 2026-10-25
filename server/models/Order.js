import mongoose from 'mongoose';

// Snapshot of the item at time of purchase
const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  variantLabel: { type: String, required: true },
  price: { type: Number, required: true },   // PKR, server-calculated
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

const orderSchema = new mongoose.Schema(
  {
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
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    // Server-calculated totals in PKR
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    couponCode: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
