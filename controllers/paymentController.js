const Razorpay = require('razorpay');
const crypto = require('crypto');
const Product = require('../models/Product');
const Order = require('../models/Order');

// NEW: lazy init so the server still boots if env vars are missing (dotenv loads after requires in index.js)
const getRazorpay = () => new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /payment/create-order
// body: { firmId, items: [{ productId, qty }], customer: { name, phone, address } }
const createOrder = async (req, res) => {
    try {
        const { firmId, items, customer } = req.body;

        if (!firmId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "firmId and items are required" });
        }
        if (!customer?.name || !customer?.phone || !customer?.address) {
            return res.status(400).json({ error: "Customer name, phone and address are required" });
        }

        // Price is calculated on the server from DB values so the client can't tamper with it
        const products = await Product.find({ _id: { $in: items.map(i => i.productId) } });
        const orderItems = [];
        let totalRupees = 0;

        for (const it of items) {
            const qty = parseInt(it.qty, 10);
            const product = products.find(p => p._id.toString() === it.productId);
            if (!product || !(qty > 0)) {
                return res.status(400).json({ error: "Invalid item in cart" });
            }
            if (!product.firm.some(f => f.toString() === firmId)) {
                return res.status(400).json({ error: `${product.productName} does not belong to this restaurant` });
            }
            const price = Number(product.price);
            if (!(price > 0)) {
                return res.status(400).json({ error: `Invalid price for ${product.productName}` });
            }
            totalRupees += price * qty;
            orderItems.push({ product: product._id, productName: product.productName, price, qty });
        }

        const amount = Math.round(totalRupees * 100); // paise

        const dbOrder = await Order.create({ firm: firmId, items: orderItems, amount, customer });

        const rzpOrder = await getRazorpay().orders.create({
            amount,
            currency: 'INR',
            receipt: dbOrder._id.toString()
        });

        dbOrder.razorpayOrderId = rzpOrder.id;
        await dbOrder.save();

        res.status(200).json({
            orderId: rzpOrder.id,
            amount: rzpOrder.amount,
            currency: rzpOrder.currency,
            keyId: process.env.RAZORPAY_KEY_ID, // public key id, safe to send
            dbOrderId: dbOrder._id
        });
    } catch (error) {
        console.error("❌ createOrder error:", error);
        res.status(500).json({ error: "Could not create payment order" });
    }
};

// POST /payment/verify
// body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing payment fields" });
        }

        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const a = Buffer.from(expected);
        const b = Buffer.from(razorpay_signature);
        const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (!valid) {
            order.status = 'failed';
            await order.save();
            return res.status(400).json({ error: "Payment verification failed" });
        }

        order.status = 'paid';
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        res.status(200).json({ message: "Payment verified", orderId: order._id });
    } catch (error) {
        console.error("❌ verifyPayment error:", error);
        res.status(500).json({ error: "Verification error" });
    }
};

module.exports = { createOrder, verifyPayment };
