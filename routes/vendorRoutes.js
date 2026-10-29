const vendorController = require('../controllers/vendorController');
const express = require('express');
const { loginLimiterByIp, loginLimiterByEmail, registerLimiter, refreshLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

// POST Routes
router.post('/register', registerLimiter, vendorController.vendorRegister);
router.post('/login', loginLimiterByIp, loginLimiterByEmail, vendorController.vendorLogin);
router.post('/refresh', refreshLimiter, vendorController.refreshSession);
router.post('/logout', vendorController.vendorLogout);

// GET Routes
router.get('/all-vendors', vendorController.getAllVendors);
router.get('/single-vendor/:id', vendorController.getVendorById); // ✅ FIXED: was /:apple

module.exports = router;
