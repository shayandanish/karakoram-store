import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  street: String,
  city: String,
  province: String,
  postalCode: String,
  country: { type: String, default: 'Pakistan' },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    // Optional: admins seeded with a password use passwordHash; Firebase users do not
    passwordHash: { type: String },
    firebaseUid: { type: String },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    status: {
      type: String,
      enum: ['unverified', 'verified', 'pending'],
      default: 'unverified',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      trim: true,
    },
    otpExpiresAt: {
      type: Date,
    },
    otpExpires: {
      type: Date,
    },
    addresses: [addressSchema],
  },
  { timestamps: true }
);

// A Firebase account can only be linked to one MongoDB user.
// Named explicitly to avoid clashing with any pre-existing firebaseUid_1 index.
userSchema.index(
  { firebaseUid: 1 },
  { unique: true, sparse: true, name: 'firebaseUid_unique' }
);

export default mongoose.model('User', userSchema);
