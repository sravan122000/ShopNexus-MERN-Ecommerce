import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../services/email.js';
const r = Router();
const validate = (req,res,next) => { const e=validationResult(req); if(!e.isEmpty()) return res.status(400).json({message:e.array()[0].msg}); next(); };
const tokenFor = u => jwt.sign(
  {
    id: u._id,
    role: u.role,
    tokenVersion: u.tokenVersion ?? 0
  },
  process.env.JWT_SECRET,
  {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
);
const safe = u => ({id:u._id,name:u.name,email:u.email,role:u.role,phone:u.phone,addresses:u.addresses,isBlocked:u.isBlocked});
r.post('/register',[body('name').trim().notEmpty(),body('email').isEmail().normalizeEmail(),body('password').isLength({min:8})],validate,asyncHandler(async(req,res)=>{
 const {name,email,password}=req.body; if(await User.findOne({email})) return res.status(409).json({message:'Email already registered'});
 const u=await User.create({name,email,password:await bcrypt.hash(password,12)});
 res.status(201).json({token:tokenFor(u),user:safe(u)});
}));
r.post('/login',[body('email').isEmail(),body('password').notEmpty()],validate,asyncHandler(async(req,res)=>{
 const u=await User.findOne({email:req.body.email.toLowerCase()});
 if(!u || !(await bcrypt.compare(req.body.password,u.password))) return res.status(401).json({message:'Invalid email or password'});
 if(u.isBlocked) return res.status(403).json({message:'Your account has been blocked'});
 res.json({token:tokenFor(u),user:safe(u)});
}));
r.get('/me',protect,(req,res)=>res.json({user:safe(req.user)}));
r.put('/profile',protect,asyncHandler(async(req,res)=>{
 const {name,phone}=req.body; if(name!==undefined) req.user.name=String(name).trim(); if(phone!==undefined) req.user.phone=String(phone).trim();
 await req.user.save(); res.json({user:safe(req.user)});
}));

r.post('/forgot-password', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email });

  if (user) {
    const now = Date.now();
    const cooldown = 60 * 1000;

    // Allow only one OTP request every 60 seconds.
    if (
      user.resetOtpRequestedAt &&
      now - user.resetOtpRequestedAt.getTime() < cooldown
    ) {
      return res.json({
        message: 'If the email exists, a password reset OTP has been sent.'
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    user.resetOtpHash = crypto
      .createHash('sha256')
      .update(otp)
      .digest('hex');

    user.resetOtpExpires = new Date(now + 10 * 60 * 1000);
    user.resetOtpRequestedAt = new Date(now);
    user.resetOtpAttempts = 0;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'ShopNexus password reset OTP',
      text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`
    });
  }

  res.json({
    message: 'If the email exists, a password reset OTP has been sent.'
  });
}));


r.post('/reset-password', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();
  const password = req.body.password;

  if (
    !email ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    !/^\d{6}$/.test(otp) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    password.length > 128
  ) {
    return res.status(400).json({
      message: 'Enter a valid email, 6-digit OTP and password (8–128 characters).'
    });
  }

  const user = await User.findOne({ email });

  if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
    return res.status(400).json({
      message: 'Invalid or expired OTP'
    });
  }

  if (user.resetOtpExpires <= new Date()) {
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    return res.status(400).json({
      message: 'Invalid or expired OTP'
    });
  }

  if ((user.resetOtpAttempts || 0) >= 5) {
    return res.status(400).json({
      message: 'Too many incorrect attempts. Request a new OTP.'
    });
  }

  const submittedHash = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  const expectedHash = Buffer.from(user.resetOtpHash, 'hex');
  const actualHash = Buffer.from(submittedHash, 'hex');

  const isValidOtp =
    expectedHash.length === actualHash.length &&
    crypto.timingSafeEqual(expectedHash, actualHash);

  if (!isValidOtp) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;

    if (user.resetOtpAttempts >= 5) {
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      user.resetOtpAttempts = 0;
    }

    await user.save();

    return res.status(400).json({
      message: 'Invalid or expired OTP'
    });
  }

  user.password = await bcrypt.hash(password, 12);

  // Invalidate all previously issued login tokens.
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  user.resetOtpRequestedAt = undefined;

  await user.save();

  res.json({
    message: 'Password updated successfully. Please log in again.'
  });
}));

export default r;
