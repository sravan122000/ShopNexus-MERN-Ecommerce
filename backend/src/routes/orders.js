import { Router } from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import { protect, adminOnly } from '../middleware/auth.js';
import { Order, Cart, Coupon } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildOrder, reserveStock, restoreStock } from '../services/order.js';
import { sendEmail } from '../services/email.js';
import { calculateDiscount } from '../utils/commerce.js';
const notoFontPath = fileURLToPath(
  new URL('../../fonts/NotoSans-Regular.ttf', import.meta.url)
);
const r=Router(); r.use(protect);
const razorpay=()=>{if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET)throw Object.assign(new Error('Razorpay is not configured'),{status:503});return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET})};
r.post('/coupon/validate',asyncHandler(async(req,res)=>{const {couponCode,subtotal}=req.body;if(!Number.isFinite(Number(subtotal))||Number(subtotal)<0)return res.status(400).json({message:'A valid subtotal is required'});const c=await Coupon.findOne({code:String(couponCode||'').toUpperCase(),isActive:true});const now=new Date();if(!c||(c.startDate&&c.startDate>now)||(c.endDate&&c.endDate<now)||(c.usageLimit!=null&&c.usedCount>=c.usageLimit)||Number(subtotal)<c.minOrderAmount)return res.status(400).json({message:'Coupon is invalid or not applicable'});const discount=calculateDiscount({subtotal,discountType:c.discountType,discountValue:c.discountValue,maxDiscount:c.maxDiscount});res.json({code:c.code,discount,total:Math.max(0,Number(subtotal)-discount)})}));
r.post('/',asyncHandler(async(req,res)=>{
 const {address,paymentMethod='COD',couponCode}=req.body;if(!address?.fullName||!address?.phone||!address?.line1||!address?.city||!address?.state||!address?.postalCode)return res.status(400).json({message:'Complete delivery address is required'});
 if(!['COD','RAZORPAY'].includes(paymentMethod))return res.status(400).json({message:'Invalid payment method'});
 const built=await buildOrder({userId:req.user._id,address,paymentMethod,couponCode});
 const session=await mongoose.startSession();let order;
 try{await session.withTransaction(async()=>{await reserveStock(built,session);[order]=await Order.create([{user:req.user._id,items:built.items,address,subtotal:built.subtotal,discount:built.discount,total:built.total,couponCode:built.coupon?.code,paymentMethod}],{session});if(built.coupon)await Coupon.updateOne({_id:built.coupon._id},{$inc:{usedCount:1}},{session});if(paymentMethod==='COD')await Cart.updateOne({user:req.user._id},{$set:{items:[]}},{session});});}finally{await session.endSession()}
 if(paymentMethod==='RAZORPAY'){try{const rp=await razorpay().orders.create({amount:Math.round(order.total*100),currency:'INR',receipt:String(order._id)});order.razorpayOrderId=rp.id;await order.save();return res.status(201).json({order,razorpayOrder:rp,keyId:process.env.RAZORPAY_KEY_ID})}catch(e){await restoreStock(order);await Order.findByIdAndDelete(order._id);throw e}}
 await sendEmail({to:req.user.email,subject:'ShopNexus order placed',text:`Your order ${order._id} has been placed. Total: ₹${order.total}`});
 res.status(201).json({order});
}));
r.post('/verify-payment',asyncHandler(async(req,res)=>{
 const {orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
 const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET||'').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
 const order=await Order.findOne({_id:orderId,user:req.user._id});if(!order||order.razorpayOrderId!==razorpay_order_id)return res.status(404).json({message:'Order not found'});
 if (
  !razorpay_signature ||
  expected.length !== razorpay_signature.length ||
  !crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(razorpay_signature, 'hex')
  )
) {
  if (order.status !== 'Cancelled' && order.paymentStatus !== 'Paid') {
    await restoreStock(order);
    order.status = 'Cancelled';
    order.paymentStatus = 'Failed';
    order.cancelReason = 'Razorpay payment verification failed';
    await order.save();
  }

  return res.status(400).json({
    message: 'Payment verification failed'
  });
}
 order.paymentStatus='Paid';order.razorpayPaymentId=razorpay_payment_id;await order.save();await Cart.updateOne({user:req.user._id},{$set:{items:[]}});
 await sendEmail({to:req.user.email,subject:'Payment received',text:`Payment received for order ${order._id}`});res.json({message:'Payment verified',order});
}));
r.post('/payment-failed',asyncHandler(async(req,res)=>{const order=await Order.findOne({_id:req.body.orderId,user:req.user._id});if(!order)return res.status(404).json({message:'Order not found'});if(order.paymentStatus==='Paid')return res.status(400).json({message:'Payment is already marked paid'});if(order.status!=='Cancelled'){await restoreStock(order);order.status='Cancelled';order.paymentStatus='Failed';order.cancelReason='Razorpay payment failed';await order.save()}res.json({message:'Failed payment recorded'})}));
r.get('/mine',asyncHandler(async(req,res)=>res.json(await Order.find({user:req.user._id}).sort({createdAt:-1}))));
r.get('/:id/invoice',asyncHandler(async(req,res)=>{const o=await Order.findOne({_id:req.params.id,user:req.user._id});if(!o)return res.status(404).json({message:'Order not found'});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename=invoice-${o._id}.pdf`);
const doc=new PDFDocument({margin:48});
doc.font(notoFontPath);
doc.pipe(res);
doc.fontSize(22).text('ShopNexus — Invoice');doc.moveDown().fontSize(10).text(`Invoice / Order: ${o._id}`).text(`Date: ${o.createdAt.toLocaleDateString()}`).text(`Payment: ${o.paymentMethod} / ${o.paymentStatus}`).moveDown();doc.fontSize(12).text('Bill to');doc.fontSize(10).text(`${o.address.fullName}\n${o.address.line1}\n${o.address.city}, ${o.address.state} ${o.address.postalCode}\n${o.address.phone}`).moveDown();o.items.forEach(i=>doc.text(`${i.name}  × ${i.quantity}  @ ₹${i.price}  = ₹${(i.price*i.quantity).toFixed(2)}`));doc.moveDown().text(`Subtotal: ₹${o.subtotal.toFixed(2)}`).text(`Discount: -₹${(o.discount||0).toFixed(2)}`).fontSize(14).text(`Total: ₹${o.total.toFixed(2)}`);doc.end()}));
r.post('/:id/cancel',asyncHandler(async(req,res)=>{const o=await Order.findOne({_id:req.params.id,user:req.user._id});if(!o)return res.status(404).json({message:'Order not found'});if(!['Pending','Processing'].includes(o.status))return res.status(400).json({message:'This order can no longer be cancelled'});if(o.paymentStatus==='Paid')return res.status(400).json({message:'Paid online orders require admin refund processing; contact support'});await restoreStock(o);o.status='Cancelled';o.cancelReason=String(req.body.reason||'Cancelled by customer');await o.save();res.json({order:o})}));
r.get('/admin/all',adminOnly,asyncHandler(async(req,res)=>res.json(await Order.find().populate('user','name email').sort({createdAt:-1}))));
r.get('/admin/:id', adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}));
r.patch('/admin/:id/status',adminOnly,asyncHandler(async(req,res)=>{const allowed=['Pending','Processing','Shipped','Delivered'];if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid status'});const o=await Order.findById(req.params.id);if(!o)return res.status(404).json({message:'Order not found'});if(o.status==='Cancelled')return res.status(400).json({message:'Cancelled order cannot be updated'});o.status=req.body.status;await o.save();const u=await (await import('../models/index.js')).User.findById(o.user);if(u)await sendEmail({to:u.email,subject:'Order status update',text:`Order ${o._id} is now ${o.status}`});res.json(o)}));
export default r;
