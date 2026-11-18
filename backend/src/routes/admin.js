import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Category, Product, User, Coupon, Order } from '../models/index.js';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  uploadProducts,
  verifyProductImages,
  cleanupFailedUploads
} from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const r = Router();
r.use(protect, adminOnly);
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) return res.status(400).json({ message: result.array()[0].msg });
  next();
};
const productRules = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Product name must be 2–120 characters'),
  body('description').trim().isLength({ min: 5, max: 5000 }).withMessage('Description must be 5–5000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be zero or greater'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a whole number zero or greater'),
  body('category').isMongoId().withMessage('Choose a valid category')
];

r.get('/categories', asyncHandler(async (req, res) => res.json(await Category.find().sort('name'))));
r.post('/categories', [body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Category name must be 2–80 characters')], validate, asyncHandler(async (req, res) => {
  const category = await Category.create({ name: req.body.name, description: String(req.body.description || '').trim() });
  res.status(201).json(category);
}));
r.put('/categories/:id',
  [
    body('name').trim().isLength({ min: 2, max: 80 })
      .withMessage('Category name must be 2–80 characters')
  ],
  validate,
  asyncHandler(async (req, res) => {
    const update = {
      name: req.body.name,
      description: String(req.body.description || '').trim()
    };

    if (typeof req.body.isActive === 'boolean') {
      update.isActive = req.body.isActive;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  })
);
r.delete('/categories/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Category deleted (deactivated)' });
}));

r.get('/products', asyncHandler(async (req, res) => res.json(await Product.find().populate('category', 'name').sort({ createdAt: -1 }))));
r.post('/products', uploadProducts, verifyProductImages, cleanupFailedUploads, productRules, validate, asyncHandler(async (req, res) => {
  if (!req.files || req.files.length < 1 || req.files.length > 3) return res.status(400).json({ message: 'Upload between 1 and 3 product images' });
  const category = await Category.findOne({ _id: req.body.category, isActive: true });
  if (!category) return res.status(400).json({ message: 'Choose an active category' });
  const images = req.files.map(file => `/uploads/${file.filename}`);
  const product = await Product.create({ name: req.body.name.trim(), description: req.body.description.trim(), price: Number(req.body.price), stock: Number(req.body.stock), category: category._id, images });
  res.status(201).json(await product.populate('category', 'name'));
}));
r.put('/products/:id', uploadProducts, verifyProductImages, cleanupFailedUploads, productRules, validate, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const category = await Category.findOne({ _id: req.body.category, isActive: true });
  if (!category) return res.status(400).json({ message: 'Choose an active category' });
  Object.assign(product, { name: req.body.name.trim(), description: req.body.description.trim(), price: Number(req.body.price), stock: Number(req.body.stock), category: category._id });
  if (req.files?.length) product.images = req.files.map(file => `/uploads/${file.filename}`);
  if (product.images.length < 1 || product.images.length > 3) return res.status(400).json({ message: 'A product must have between 1 and 3 images' });
  await product.save();
  res.json(await product.populate('category', 'name'));
}));
r.delete('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted (deactivated)' });
}));
r.patch('/products/:id/activate', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({ message: 'Product reactivated', product });
}));

r.get('/users', asyncHandler(async (req, res) => res.json(await User.find({ role: 'user' }).select('name email isBlocked createdAt').sort({ createdAt: -1 }))));
r.patch('/users/:id/block', asyncHandler(async (req, res) => {
  if (typeof req.body.blocked !== 'boolean') return res.status(400).json({ message: 'blocked must be true or false' });
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.isBlocked = req.body.blocked;
  await user.save();
  res.json({ message: user.isBlocked ? 'User blocked' : 'User unblocked', user: { id: user._id, isBlocked: user.isBlocked } });
}));

// The remaining routes are used by later project modules.
r.get('/dashboard', asyncHandler(async (req, res) => {
  const [totalOrders, sales, totalUsers, totalProducts, activeProducts] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      {
        $match: {
          paymentStatus: { $in: ['Paid', 'Pending'] },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]),
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    Product.countDocuments({ isActive: true })
  ]);

  res.json({
    totalOrders,
    totalSales: sales[0]?.total || 0,
    totalUsers,
    totalProducts,
    activeProducts
  });
}));
r.get('/reports', asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date('2000-01-01');
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : new Date();
  const rows = await Order.aggregate([{ $match: { createdAt: { $gte: from, $lte: to }, status: { $ne: 'Cancelled' } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 }, sales: { $sum: '$total' } } }, { $sort: { _id: 1 } }]);
  res.json({ from, to, rows, totals: rows.reduce((a, x) => ({ orders: a.orders + x.orders, sales: a.sales + x.sales }), { orders: 0, sales: 0 }) });
}));

const couponFields = (body) => {
  const allowed = [
    'code',
    'discountType',
    'discountValue',
    'minOrderAmount',
    'maxDiscount',
    'usageLimit',
    'startDate',
    'endDate',
    'isActive'
  ];

  const data = {};

  for (const field of allowed) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  if (data.code !== undefined) {
    data.code = String(data.code).trim().toUpperCase();
  }

  return data;
};

r.get('/coupons', asyncHandler(async (req, res) => {
  res.json(await Coupon.find().sort({ createdAt: -1 }));
}));

r.post('/coupons', asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(couponFields(req.body));
  res.status(201).json(coupon);
}));

r.put('/coupons/:id', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    couponFields(req.body),
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.json(coupon);
}));

r.patch('/coupons/:id/deactivate', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.json(coupon);
}));

export default r;
