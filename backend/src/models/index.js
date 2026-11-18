import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const addressSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  line1: { type: String, required: true, trim: true },
  line2: { type: String, trim: true, default: '' },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India' }
}, { _id: true });

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isBlocked: { type: Boolean, default: false },
  phone: { type: String, default: '' },
  addresses: [addressSchema],
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    resetOtpHash: String,
  resetOtpExpires: Date,
  resetOtpAttempts: { type: Number, default: 0 },
  resetOtpRequestedAt: Date,
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });
export const User = model('User', userSchema);

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export const Category = model('Category', categorySchema);

const productSchema = new Schema({
  name: { type: String, required: true, trim: true, index: 'text' },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  images: { type: [{ type: String }], validate: { validator: value => value.length >= 1 && value.length <= 3, message: 'A product must have between 1 and 3 images' } },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ name: 'text', description: 'text' });
export const Product = model('Product', productSchema);

const cartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, min: 1, required: true }
}, { _id: false });
export const Cart = model('Cart', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  items: [cartItemSchema]
}, { timestamps: true }));

const orderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: String, image: String, price: Number, quantity: Number
}, { _id: false });
const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  address: { type: addressSchema, required: true },
  subtotal: Number, discount: { type: Number, default: 0 }, total: Number,
  couponCode: String,
  paymentMethod: { type: String, enum: ['COD', 'RAZORPAY'], required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed', 'Refunded'], default: 'Pending' },
  razorpayOrderId: String, razorpayPaymentId: String,
  status: { type: String, enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Pending' },
  cancelReason: String
}, { timestamps: true });
export const Order = model('Order', orderSchema);

export const Coupon = model('Coupon', new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  startDate: Date, endDate: Date, isActive: { type: Boolean, default: true }
}, { timestamps: true }));
