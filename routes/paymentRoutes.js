const express = require('express');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

// NEW: Razorpay routes
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
