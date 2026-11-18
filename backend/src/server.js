import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import userRoutes from './routes/user.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import errorHandler from './middleware/error.js';
const app=express();
app.use(cors({origin:process.env.CLIENT_URL?.split(',')||'http://localhost:5173'}));
app.use(express.json({limit:'1mb'}));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Please try again later.'
  }
});

const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset attempts. Please try again later.'
  }
});

// General authentication protection
app.use('/api/auth', authRateLimit);

// Additional protection for password reset
app.use('/api/auth/forgot-password', forgotPasswordRateLimit);
app.use('/api/auth/reset-password', resetPasswordRateLimit);

const here=path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads',express.static(path.resolve(here,'../uploads')));
app.get('/api/health',(req,res)=>res.json({status:'ok'}));
app.use('/api/auth',authRoutes);
app.use('/api',catalogRoutes);
app.use('/api/user',userRoutes);
app.use('/api/orders',orderRoutes);
app.use('/api/admin',adminRoutes);
app.use((req,res)=>res.status(404).json({message:'Route not found'}));
app.use(errorHandler);
const port=process.env.PORT||5000;
connectDB().then(()=>app.listen(port,()=>console.log(`API running on port ${port}`))).catch(e=>{console.error(e);process.exit(1)});
