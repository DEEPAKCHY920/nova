const express = require('express');
const router = express.Router();
const {
  getStats,
  getCustomers,
  getCustomer,
  setCustomerStatus,
  getSettings,
  updateSettings
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.use(protect, admin);

router.get('/stats', getStats);
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id/status', setCustomerStatus);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
