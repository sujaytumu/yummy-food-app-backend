const express = require('express');
const paymentController = require('../controllers/paymentController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// NEW: Razorpay routes
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/order/:orderId', paymentController.getOrderSummary);       // NEW
router.get('/receipt/:orderId', paymentController.downloadReceipt);      // NEW (PDF)
router.get('/vendor-orders', verifyToken, paymentController.getVendorOrders); // NEW (vendor dashboard)

module.exports = router;
