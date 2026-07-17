const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  adminLogin,
  logoutUser,
  getMe,
  updateMe,
  changePassword,
  addAddress,
  deleteAddress
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/admin-login', adminLogin);
router.post('/logout', logoutUser);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, changePassword);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:addressId', protect, deleteAddress);

module.exports = router;
