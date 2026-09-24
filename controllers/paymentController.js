const Razorpay = require('razorpay');
const crypto = require('crypto');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const { buildReceiptPdf } = require('../utils/receiptPdf');

// NEW: lazy init so the server still boots if env vars are missing (dotenv loads after requires in index.js)
const getRazorpay = () => new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// NEW: Product.price is a String in the DB and may be saved like "₹80", "80/-", "1,200" or "Rs. 99.50".
// Strip everything except digits and '.', then parse -> avoids NaN reaching Razorpay.
const parsePrice = (raw) => {
    const n = parseFloat(String(raw ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};

// NEW: turn Razorpay's payment object into a short readable string
const describePayment = (pay) => {
    switch (pay.method) {
        case 'upi': return `UPI${pay.vpa ? ': ' + pay.vpa : ''}`;
        case 'card': {
            const c = pay.card || {};
            return `${c.network || ''} ${c.type || ''} card${c.last4 ? ' ending ' + c.last4 : ''}`.replace(/\s+/g, ' ').trim();
        }
        case 'netbanking': return `Netbanking${pay.bank ? ': ' + pay.bank : ''}`;
        case 'wallet': return `Wallet${pay.wallet ? ': ' + pay.wallet : ''}`;
        default: return pay.method || 'Online';
    }
};

// NEW: a receipt/summary is only released for a PAID order and only with its payment id (not guessable from the order id alone)
const findPaidOrder = async (orderId, pid) => {
    if (!/^[a-f0-9]{24}$/i.test(String(orderId || '')) || !pid) return null;
    const order = await Order.findById(orderId).populate('firm', 'firmName area');
    if (!order || order.status !== 'paid' || order.razorpayPaymentId !== pid) return null;
    return order;
};

// GET /payment/order/:orderId?pid=pay_xxx  -> JSON summary shown after payment
const getOrderSummary = async (req, res) => {
    try {
        const order = await findPaidOrder(req.params.orderId, req.query.pid);
        if (!order) return res.status(404).json({ error: "Order not found" });
        res.status(200).json({
            orderId: order._id,
            restaurant: order.firm?.firmName,
            items: order.items,
            amount: order.amount / 100,
            paymentId: order.razorpayPaymentId,
            paymentMethod: order.paymentMethod,
            paymentDetail: order.paymentDetail,
            paidAt: order.paidAt
        });
    } catch (error) {
        console.error("❌ getOrderSummary error:", error);
        res.status(500).json({ error: "Could not load order" });
    }
};

// GET /payment/receipt/:orderId?pid=pay_xxx  -> PDF download
const downloadReceipt = async (req, res) => {
    try {
        const order = await findPaidOrder(req.params.orderId, req.query.pid);
        if (!order) return res.status(404).json({ error: "Receipt not found" });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Yummy-Receipt-${order._id.toString().slice(-8).toUpperCase()}.pdf"`);
        const doc = buildReceiptPdf(order);
        doc.pipe(res);
        doc.end();
    } catch (error) {
        console.error("❌ downloadReceipt error:", error);
        if (!res.headersSent) res.status(500).json({ error: "Could not generate receipt" });
    }
};

// GET /payment/vendor-orders  (vendor login required) -> paid orders of this vendor's firms
const getVendorOrders = async (req, res) => {
    try {
        const vendor = await Vendor.findById(req.vendorId);
        if (!vendor) return res.status(404).json({ error: "Vendor not found" });
        const orders = await Order.find({ firm: { $in: vendor.firm }, status: 'paid' })
            .populate('firm', 'firmName')
            .sort({ paidAt: -1, createdAt: -1 })
            .limit(200);
        res.status(200).json({ orders });
    } catch (error) {
        console.error("❌ getVendorOrders error:", error);
        res.status(500).json({ error: "Could not load orders" });
    }
};

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
            const price = parsePrice(product.price); // UPDATED: was Number(product.price) -> NaN for "₹80"
            if (!(price > 0)) {
                return res.status(400).json({ error: `Invalid price for ${product.productName}` });
            }
            totalRupees += price * qty;
            orderItems.push({ product: product._id, productName: product.productName, price, qty });
        }

        const amount = Math.round(totalRupees * 100); // paise
        // UPDATED: Razorpay needs an integer amount >= 100 paise (₹1)
        if (!Number.isInteger(amount) || amount < 100) {
            return res.status(400).json({ error: "Invalid order amount" });
        }
        // NEW: Razorpay's default per-order limit is ₹5,00,000 -> friendly message instead of a 500
        if (amount > 50000000) {
            return res.status(400).json({ error: "Order total is too high (max ₹5,00,000). Please reduce items or check the product prices." });
        }

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
        // NEW: pass Razorpay's own reason (e.g. "Amount exceeds maximum amount allowed.") to the client
        const rzpMsg = error?.error?.description;
        if (rzpMsg) {
            return res.status(400).json({ error: rzpMsg });
        }
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
        order.paidAt = new Date();

        // NEW: fetch how the customer paid (UPI / card / netbanking) for the receipt.
        // Best effort - a failure here must never fail a payment that is already verified.
        try {
            const pay = await getRazorpay().payments.fetch(razorpay_payment_id);
            order.paymentMethod = pay.method;
            order.paymentDetail = describePayment(pay);
        } catch (e) {
            console.error("⚠️ could not fetch payment details:", e?.error?.description || e.message);
        }
        await order.save();

        res.status(200).json({ message: "Payment verified", orderId: order._id, paymentId: razorpay_payment_id });
    } catch (error) {
        console.error("❌ verifyPayment error:", error);
        res.status(500).json({ error: "Verification error" });
    }
};

module.exports = { createOrder, verifyPayment, getOrderSummary, downloadReceipt, getVendorOrders };
