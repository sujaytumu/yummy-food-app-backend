const express = require('express');
const productController = require("../controllers/productController");
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.post('/add-product/:firmId', productController.addProduct);
router.get('/:firmId/products', productController.getProductByFirm);

router.patch('/:productId', verifyToken, productController.updateProduct);
router.delete('/:productId', verifyToken, productController.deleteProductById);

module.exports = router;