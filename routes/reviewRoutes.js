const express = require('express');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.post('/', reviewController.addReview);
router.get('/order/:orderId', reviewController.getOrderReviews);
router.get('/firm/:firmId', reviewController.getFirmRatings);
router.get('/product/:productId', reviewController.getProductReviews);

module.exports = router;
