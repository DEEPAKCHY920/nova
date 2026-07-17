const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const { generateToken, sendTokenCookie } = require('../utils/generateToken');

// @desc    Register a new customer
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({ name, email, password, phone });
  const token = generateToken(user._id, user.role);
  sendTokenCookie(res, token);

  res.status(201).json({ success: true, token, user: user.toSafeObject() });
});

// @desc    Login (customer or admin — role comes back in the response)
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id, user.role);
  sendTokenCookie(res, token);

  res.json({ success: true, token, user: user.toSafeObject() });
});

// @desc    Admin login — same credentials check, but rejects non-admin accounts.
//          Used by admin-login.html so a customer account can never reach /admin*.html.
// @route   POST /api/auth/admin-login
// @access  Public
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password)) || user.role !== 'admin') {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }

  const token = generateToken(user._id, user.role);
  sendTokenCookie(res, token);
  res.json({ success: true, token, user: user.toSafeObject() });
});

// @desc    Logout — clears the auth cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie('nova_token');
  res.json({ success: true, message: 'Logged out' });
});

// @desc    Get the logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc    Update name / phone
// @route   PUT /api/auth/me
// @access  Private
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name) req.user.name = name;
  if (phone) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, user: req.user.toSafeObject() });
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Current and new password are required');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});

// @desc    Add a shipping address
// @route   POST /api/auth/addresses
// @access  Private
const addAddress = asyncHandler(async (req, res) => {
  const address = req.body;
  if (address.isDefault) {
    req.user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }
  req.user.addresses.push(address);
  await req.user.save();
  res.status(201).json({ success: true, addresses: req.user.addresses });
});

// @desc    Delete a shipping address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
const deleteAddress = asyncHandler(async (req, res) => {
  req.user.addresses = req.user.addresses.filter(
    (a) => a._id.toString() !== req.params.addressId
  );
  await req.user.save();
  res.json({ success: true, addresses: req.user.addresses });
});

module.exports = {
  registerUser,
  loginUser,
  adminLogin,
  logoutUser,
  getMe,
  updateMe,
  changePassword,
  addAddress,
  deleteAddress
};
