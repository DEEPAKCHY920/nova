const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Product = require('../models/Product');

// @desc    Get the logged-in user's wishlist (populated with product details)
// @route   GET /api/wishlist
// @access  Private
const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist');
  res.json({ success: true, wishlist: user.wishlist });
});

// @desc    Add a product to the wishlist
// @route   POST /api/wishlist/:productId
// @access  Private
const addToWishlist = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.productId);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const alreadyIn = req.user.wishlist.some((id) => id.toString() === req.params.productId);
  if (!alreadyIn) {
    req.user.wishlist.push(product._id);
    await req.user.save();
  }

  res.status(201).json({ success: true, wishlist: req.user.wishlist });
});

// @desc    Remove a product from the wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = asyncHandler(async (req, res) => {
  req.user.wishlist = req.user.wishlist.filter(
    (id) => id.toString() !== req.params.productId
  );
  await req.user.save();
  res.json({ success: true, wishlist: req.user.wishlist });
});

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
