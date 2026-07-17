const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getCategoryCounts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

// Public
router.get('/', getProducts);
router.get('/meta/categories', getCategoryCounts);

// Admin (must be declared before the "/:idOrSlug" catch-all)
router.get('/admin/all', protect, admin, getAllProductsAdmin);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

// Public single-product lookup (id or slug)
router.get('/:idOrSlug', getProduct);

module.exports = router;
