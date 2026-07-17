const asyncHandler = require('../middleware/asyncHandler');
const Product = require('../models/Product');

// @desc    List products with filters, sorting, pagination
//          Mirrors the filter sidebar in collection.html / men.html / women.html:
//          category, gender, size, color, feature, tag, minPrice/maxPrice, search
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const {
    category,
    gender,
    size,
    color,
    feature,
    tag,
    minPrice,
    maxPrice,
    search,
    sort,
    page = 1,
    limit = 12
  } = req.query;

  const query = { isActive: true };

  if (category) query.category = { $in: category.split(',') };
  if (gender) query.gender = { $in: gender.split(',') };
  if (color) query.color = { $in: color.split(',') };
  if (feature) query.features = { $all: feature.split(',') };
  if (tag) query.tags = { $in: tag.split(',') };
  if (size) query['sizes.size'] = { $in: size.split(',').map(Number) };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (search) query.$text = { $search: search };

  const sortMap = {
    'price-low': { price: 1 },
    'price-high': { price: -1 },
    rating: { 'rating.average': -1 },
    newest: { createdAt: -1 },
    featured: { createdAt: -1 }
  };
  const sortBy = sortMap[sort] || sortMap.featured;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 48);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortBy).skip(skip).limit(limitNum),
    Product.countDocuments(query)
  ]);

  res.json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    products
  });
});

// @desc    Get a single product by its Mongo _id or its slug
// @route   GET /api/products/:idOrSlug
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };

  const product = await Product.findOne({ ...query, isActive: true });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json({ success: true, product });
});

// @desc    Category counts for the filter sidebar, e.g. "Running (38)"
// @route   GET /api/products/meta/categories
// @access  Public
const getCategoryCounts = asyncHandler(async (req, res) => {
  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, counts });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  Object.assign(product, req.body);
  await product.save();
  res.json({ success: true, product });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
});

// @desc    List every product, including inactive ones — for admin-products.html
// @route   GET /api/products/admin/all
// @access  Private/Admin
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  res.json({ success: true, count: products.length, products });
});

module.exports = {
  getProducts,
  getProduct,
  getCategoryCounts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin
};
