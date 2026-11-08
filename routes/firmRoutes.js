const express = require('express');
const firmController = require('../controllers/firmController');
const verifyToken = require('../middlewares/verifyToken');


const router = express.Router()

router.post('/add-firm', verifyToken, firmController.addFirm);

router.patch('/:firmId/open', verifyToken, firmController.setOpen);
router.delete('/:firmId', verifyToken, firmController.deleteFirmById);


module.exports = router;