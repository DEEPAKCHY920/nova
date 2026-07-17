const asyncHandler = require('../middleware/asyncHandler');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

// Builds the response shape the frontend cart drawer expects, pricing items
// from the live product price rather than a stored snapshot.
const buildCartResponse = async (cart) => {
  const populated = await cart.populate('items.product');
  const items = populated.items
    .filter((item) => item.product) // drop items whose product was deleted
    .map((item) => ({
      _id: item._id,
      product: {
        _id: item.product._id,
        name: item.product.name,
        slug: item.product.slug,
        price: item.product.price,
        image: item.product.images?.[0] || ''
      },
      size: item.size,
      qty: item.qty,
      lineTotal: item.product.price * item.qty
    }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, subtotal, itemCount };
};

// @desc    Get the logged-in user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, cart: await buildCartResponse(cart) });
});

// @desc    Add an item (or increase quantity if the same product+size is already in the cart)
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const { productId, size, qty = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error('Product not found');
  }

  const sizeEntry = product.sizes.find((s) => s.size === Number(size));
  if (!sizeEntry) {
    res.status(400);
    throw new Error('Selected size is not available for this product');
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find(
    (i) => i.product.toString() === productId && i.size === Number(size)
  );

  if (existing) {
    existing.qty += Number(qty);
  } else {
    cart.items.push({ product: productId, size: Number(size), qty: Number(qty) });
  }

  await cart.save();
  res.status(201).json({ success: true, cart: await buildCartResponse(cart) });
});

// @desc    Update a cart item's quantity (setting qty to 0 removes it)
// @route   PUT /api/cart/:itemId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { qty } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);

  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  if (Number(qty) <= 0) {
    item.deleteOne();
  } else {
    item.qty = Number(qty);
  }

  await cart.save();
  res.json({ success: true, cart: await buildCartResponse(cart) });
});

// @desc    Remove a single item from the cart
// @route   DELETE /api/cart/:itemId
// @access  Private
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (item) item.deleteOne();
  await cart.save();
  res.json({ success: true, cart: await buildCartResponse(cart) });
});

// @desc    Empty the cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, cart: await buildCartResponse(cart) });
});

module.exports = { getCart, addToCart, updateCartItem, removeCartItem, clearCart };
