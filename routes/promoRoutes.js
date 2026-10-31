const express = require('express');
const promoController = require('../controllers/promoController');
const verifyToken = require('../middlewares/verifyToken');
const { validateLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/validate', validateLimiter, promoController.validatePromo); // customer
router.get('/mine', verifyToken, promoController.listMyPromos);           // vendor
router.post('/', verifyToken, promoController.createPromo);
router.patch('/:id', verifyToken, promoController.setActive);
router.delete('/:id', verifyToken, promoController.deletePromo);

module.exports = router;
