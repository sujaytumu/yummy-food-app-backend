const vendorController = require('../controllers/vendorController');
const express = require('express');
const { loginLimiter, registerLimiter } = require('../middlewares/rateLimiter'); // per-IP limits
const { loginLimiterByEmail, refreshLimiter } = require('../middlewares/rateLimit'); // per-account + refresh

const router = express.Router();

// POST Routes
router.post('/register', registerLimiter, vendorController.vendorRegister);
router.post('/login', loginLimiter, loginLimiterByEmail, vendorController.vendorLogin);
router.post('/refresh', refreshLimiter, vendorController.refreshSession);
router.post('/logout', vendorController.vendorLogout);

// GET Routes
router.get('/all-vendors', vendorController.getAllVendors);
router.get('/single-vendor/:id', vendorController.getVendorById); // ✅ FIXED: was /:apple

module.exports = router;
