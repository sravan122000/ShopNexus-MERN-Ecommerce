
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired token'
    });
  }

  const user = await User.findById(decoded.id)
    .select('-password -resetOtpHash');

  if (!user || user.isBlocked) {
    return res.status(403).json({
      message: 'Account unavailable'
    });
  }

  // Reject tokens issued before a password reset.
  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    return res.status(401).json({
      message: 'Session expired. Please log in again.'
    });
  }

  req.user = user;
  next();
});

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required'
    });
  }

  next();
};
