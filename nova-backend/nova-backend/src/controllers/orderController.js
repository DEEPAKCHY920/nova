const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Settings = require('../models/Settings');

const generateOrderNumber = () => {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `NOVA-${Date.now().toString().slice(-6)}${rand}`;
};

// @desc    Place an order from the current cart (Cash on Delivery only)
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, notes } = req.body;
  if (!shippingAddress) {
    res.status(400);
    throw new Error('Shipping address is required');
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }

  // Validate stock and snapshot line items before touching the database.
  const items = [];
  for (const cartItem of cart.items) {
    const product = cartItem.product;
    if (!product || !product.isActive) {
      res.status(400);
      throw new Error(`${product?.name || 'A product'} is no longer available`);
    }
    const sizeEntry = product.sizes.find((s) => s.size === cartItem.size);
    if (!sizeEntry || sizeEntry.stock < cartItem.qty) {
      res.status(400);
      throw new Error(`${product.name} (UK ${cartItem.size}) is out of stock`);
    }
    items.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || '',
      size: cartItem.size,
      qty: cartItem.qty,
      price: product.price
    });
  }

  const settings = (await Settings.findOne()) || {};
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingFee =
    subtotal >= (settings.freeShippingThreshold ?? 999) ? 0 : settings.shippingFee ?? 99;
  const tax = Math.round(subtotal * ((settings.taxPercent ?? 0) / 100));
  const total = subtotal + shippingFee + tax;

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user._id,
    items,
    shippingAddress,
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    orderStatus: 'placed',
    statusHistory: [{ status: 'placed', note: 'Order placed by customer' }],
    subtotal,
    shippingFee,
    tax,
    total,
    notes
  });

  // Decrement stock per ordered size.
  await Promise.all(
    cart.items.map((cartItem) =>
      Product.updateOne(
        { _id: cartItem.product._id, 'sizes.size': cartItem.size },
        { $inc: { 'sizes.$.stock': -cartItem.qty } }
      )
    )
  );

  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

// @desc    Get the logged-in user's own orders
// @route   GET /api/orders/mine
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: orders.length, orders });
});

// @desc    Get a single order (the owner, or an admin, may view it)
// @route   GET /api/orders/:id
// @access  Private
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to view this order');
  }
  res.json({ success: true, order });
});

// @desc    Cancel your own order — only while it hasn't shipped yet
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized');
  }
  if (!['placed', 'confirmed'].includes(order.orderStatus)) {
    res.status(400);
    throw new Error('This order can no longer be cancelled');
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();

  res.json({ success: true, order });
});

// ---------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------

// @desc    List every order — for admin-orders.html
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.orderStatus = status;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(query)
  ]);

  res.json({
    success: true,
    count: orders.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    orders
  });
});

// @desc    Update an order's status (placed → confirmed → processing → shipped → delivered)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const allowed = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error('Invalid order status');
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.orderStatus = status;
  if (status === 'delivered') order.paymentStatus = 'paid'; // COD collected on delivery
  order.statusHistory.push({ status, note });
  await order.save();

  res.json({ success: true, order });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
};
