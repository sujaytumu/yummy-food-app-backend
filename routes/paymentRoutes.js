const express = require('express');
const paymentController = require('../controllers/paymentController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// NEW: Razorpay routes
router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/order/:orderId', paymentController.getOrderSummary);       // NEW
router.get('/receipt/:orderId', paymentController.downloadReceipt);      // NEW (PDF)
router.post('/send-receipt', paymentController.sendReceipt);               // NEW (email PDF)
router.get('/vendor-orders', verifyToken, paymentController.getVendorOrders); // NEW (vendor dashboard)
router.get('/vendor-analytics', verifyToken, paymentController.getVendorAnalytics); // vendor dashboard charts
router.get('/track/:orderId', paymentController.trackOrder);                              // NEW (customer polling)
router.patch('/order-status/:orderId', verifyToken, paymentController.updateOrderStatus); // NEW (vendor)

module.exports = router;
