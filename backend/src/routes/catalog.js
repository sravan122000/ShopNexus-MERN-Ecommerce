
import { Router } from 'express';
import { Category, Product } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const r = Router();

// Escape special characters before using user input in a regular expression
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

r.get('/categories', asyncHandler(async (req, res) => {
  res.json(
    await Category.find({ isActive: true }).sort('name')
  );
}));

r.get('/products', asyncHandler(async (req, res) => {
  const { q, category, page = 1, limit = 12 } = req.query;

  const filter = { isActive: true };

  if (category) {
    filter.category = category;
  }

  if (q && String(q).trim()) {
  const searchText = String(q).trim();

  // Product name and description search: case-insensitive
  const productRegex = new RegExp(escapeRegex(searchText), 'i');

  // Category name search: case-sensitive
  const categoryRegex = new RegExp(escapeRegex(searchText));

  const matchingCategories = await Category.find({
    name: categoryRegex,
    isActive: true
  }).select('_id');

  const categoryIds = matchingCategories.map(c => c._id);

  const searchConditions = [
    { name: productRegex },
    { description: productRegex }
  ];

  if (categoryIds.length > 0) {
    searchConditions.push({
      category: { $in: categoryIds }
    });
  }

  filter.$or = searchConditions;
}
  const currentPage = Math.max(1, Number(page) || 1);
  const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

  const products = await Product.find(filter)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(pageLimit)
    .skip((currentPage - 1) * pageLimit);

  const total = await Product.countDocuments(filter);

  res.json({
    products,
    total,
    page: currentPage,
    pages: Math.ceil(total / pageLimit)
  });
}));

r.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isActive: true
  }).populate('category', 'name');

  if (!product) {
    return res.status(404).json({
      message: 'Product not found'
    });
  }

  const related = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    isActive: true
  }).limit(4);

  res.json({ product, related });
}));

export default r;
