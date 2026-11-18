
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import { User } from './models/index.js';

try {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@example.com')
    .toLowerCase();

  const password = process.env.ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters');
  }

  let user = await User.findOne({ email });

  const hashedPassword = await bcrypt.hash(password, 12);

  if (user) {
    user.password = hashedPassword;
    user.role = 'admin';
    user.isBlocked = false;
    await user.save();

    console.log('Admin password updated:', email);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || 'Store Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      isBlocked: false
    });

    console.log('Admin created:', email);
  }

  process.exit(0);
} catch (error) {
  console.error('Admin setup failed:', error.message);
  process.exit(1);
}
