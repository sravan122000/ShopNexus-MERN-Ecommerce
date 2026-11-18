import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { User, Cart, Product } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isValidQuantity } from '../utils/commerce.js';
const r=Router(); r.use(protect);
r.get('/addresses',(req,res)=>res.json(req.user.addresses));
r.post('/addresses', asyncHandler(async (req, res) => {
  const {
    fullName,
    phone,
    line1,
    line2,
    city,
    state,
    postalCode,
    country
  } = req.body;

  if (
    !fullName?.trim() ||
    !phone?.trim() ||
    !line1?.trim() ||
    !city?.trim() ||
    !state?.trim() ||
    !postalCode?.trim() ||
    !country?.trim()
  ) {
    return res.status(400).json({
      message: 'Please provide all required address fields'
    });
  }

  if (!/^[0-9]{10}$/.test(phone.trim())) {
    return res.status(400).json({
      message: 'Please enter a valid 10-digit phone number'
    });
  }

  if (!/^[0-9]{6}$/.test(postalCode.trim())) {
    return res.status(400).json({
      message: 'Please enter a valid 6-digit postal code'
    });
  }

  req.user.addresses.push({
    fullName: fullName.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    line2: line2?.trim() || '',
    city: city.trim(),
    state: state.trim(),
    postalCode: postalCode.trim(),
    country: country.trim()
  });

  await req.user.save();

  res.status(201).json(req.user.addresses);
}));
r.put('/addresses/:id',asyncHandler(async(req,res)=>{const a=req.user.addresses.id(req.params.id);if(!a)return res.status(404).json({message:'Address not found'});Object.assign(a,req.body);await req.user.save();res.json(req.user.addresses)}));
r.delete('/addresses/:id',asyncHandler(async(req,res)=>{req.user.addresses.pull(req.params.id);await req.user.save();res.json(req.user.addresses)}));
r.get('/wishlist',asyncHandler(async(req,res)=>{await req.user.populate('wishlist');res.json(req.user.wishlist)}));
r.post('/wishlist/:productId',asyncHandler(async(req,res)=>{if(!await Product.findById(req.params.productId))return res.status(404).json({message:'Product not found'});if(!req.user.wishlist.some(x=>String(x)===req.params.productId))req.user.wishlist.push(req.params.productId);await req.user.save();await req.user.populate('wishlist');res.json(req.user.wishlist)}));
r.delete('/wishlist/:productId',asyncHandler(async(req,res)=>{req.user.wishlist.pull(req.params.productId);await req.user.save();res.json({message:'Removed from wishlist'})}));
r.get('/cart',asyncHandler(async(req,res)=>{const c=await Cart.findOne({user:req.user._id}).populate('items.product');res.json(c||{items:[]})}));
r.post('/cart',asyncHandler(async(req,res)=>{const {productId,quantity=1}=req.body;const qty=Number(quantity);if(!isValidQuantity(qty))return res.status(400).json({message:'Quantity must be a positive integer'});const p=await Product.findOne({_id:productId,isActive:true});if(!p)return res.status(404).json({message:'Product not found'});if(qty>p.stock)return res.status(400).json({message:'Requested quantity exceeds available stock'});let c=await Cart.findOne({user:req.user._id});if(!c)c=await Cart.create({user:req.user._id,items:[]});const item=c.items.find(i=>String(i.product)===String(productId));if(item)item.quantity=Math.min(p.stock,item.quantity+qty);else c.items.push({product:productId,quantity:qty});await c.save();await c.populate('items.product');res.json(c)}));
r.patch('/cart/:productId',asyncHandler(async(req,res)=>{const qty=Number(req.body.quantity);if(!isValidQuantity(qty))return res.status(400).json({message:'Quantity must be a positive integer'});const p=await Product.findById(req.params.productId);if(!p||qty>p.stock)return res.status(400).json({message:'Quantity exceeds available stock'});const c=await Cart.findOne({user:req.user._id});if(!c)return res.status(404).json({message:'Cart not found'});const item=c.items.find(i=>String(i.product)===req.params.productId);if(!item)return res.status(404).json({message:'Item not found'});item.quantity=qty;await c.save();await c.populate('items.product');res.json(c)}));
r.delete('/cart/:productId',asyncHandler(async(req,res)=>{const c=await Cart.findOne({user:req.user._id});if(c){c.items=c.items.filter(i=>String(i.product)!==req.params.productId);await c.save();await c.populate('items.product')}res.json(c||{items:[]})}));
export default r;
