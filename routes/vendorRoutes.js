const vendorController = require('../controllers/vendorController');
const express = require('express');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimiter'); // NEW

const router = express.Router();

// POST Routes
router.post('/register', registerLimiter, vendorController.vendorRegister); // UPDATED: rate-limited
router.post('/login', loginLimiter, vendorController.vendorLogin);          // UPDATED: rate-limited

// GET Routes
router.get('/all-vendors', vendorController.getAllVendors);
router.get('/single-vendor/:id', vendorController.getVendorById); // ✅ FIXED: was /:apple

module.exports = router;
