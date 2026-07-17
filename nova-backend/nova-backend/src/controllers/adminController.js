const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Settings = require('../models/Settings');

// @desc    Dashboard summary numbers — for admin.html
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = asyncHandler(async (req, res) => {
  const [totalCustomers, totalProducts, orders] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({}),
    Order.find({ orderStatus: { $ne: 'cancelled' } })
  ]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const [recentOrders, statusBreakdown] = await Promise.all([
    Order.find({}).populate('user', 'name email').sort({ createdAt: -1 }).limit(5),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }])
  ]);

  res.json({
    success: true,
    stats: { totalCustomers, totalProducts, totalOrders, totalRevenue },
    recentOrders,
    statusBreakdown
  });
});

// @desc    List customers — for admin-customers.html
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const query = { role: 'customer' };
  if (search) {
    query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  }

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);

  const [customers, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    User.countDocuments(query)
  ]);

  res.json({
    success: true,
    count: customers.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
    customers
  });
});

// @desc    Get a single customer plus their order history
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 });
  res.json({ success: true, customer, orders });
});

// @desc    Activate / deactivate a customer account
// @route   PUT /api/admin/customers/:id/status
// @access  Private/Admin
const setCustomerStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const customer = await User.findById(req.params.id);
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  customer.isActive = Boolean(isActive);
  await customer.save();
  res.json({ success: true, customer });
});

// @desc    Get store settings — for admin-settings.html
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  res.json({ success: true, settings });
});

// @desc    Update store settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();
  Object.assign(settings, req.body);
  await settings.save();
  res.json({ success: true, settings });
});

module.exports = {
  getStats,
  getCustomers,
  getCustomer,
  setCustomerStatus,
  getSettings,
  updateSettings
};
