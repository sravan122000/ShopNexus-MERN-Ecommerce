import mongoose from 'mongoose';
import { Product, Cart, Order, Coupon } from '../models/index.js';
import { AppError } from '../utils/errors.js';

export async function buildOrder({ userId, address, paymentMethod, couponCode }) {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || !cart.items.length) throw new AppError('Your cart is empty');
  let subtotal = 0;
  const items = [];
  for (const line of cart.items) {
    const p = line.product;
    if (!p || !p.isActive) throw new AppError('A product in your cart is unavailable');
    if (line.quantity > p.stock) throw new AppError(`Only ${p.stock} unit(s) of ${p.name} are available`);
    subtotal += p.price * line.quantity;
    items.push({ product: p._id, name: p.name, image: p.images[0] || '', price: p.price, quantity: line.quantity });
  }
  let discount = 0, coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    const now = new Date();
    if (!coupon || (coupon.startDate && coupon.startDate > now) || (coupon.endDate && coupon.endDate < now) ||
      (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) || subtotal < coupon.minOrderAmount)
      throw new AppError('Coupon is invalid or not applicable');
    discount = coupon.discountType === 'percentage' ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(subtotal, discount);
  }
  return { items, subtotal, discount, total: Math.max(0, subtotal - discount), coupon };
}
export async function reserveStock(order, session) {
  for (const item of order.items) {
    const result = await Product.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { session });
    if (!result.modifiedCount) throw new AppError(`Insufficient stock for ${item.name}`);
  }
}
export async function restoreStock(order) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, { session });
    });
  } finally { await session.endSession(); }
}
