const mongoose = require('mongoose');
const Order = require('../models/Order');
const Review = require('../models/Review');

const isId = (v) => /^[a-f0-9]{24}$/i.test(String(v || ''));

// Same access rule as receipts/tracking: the payment id proves the caller placed the order.
const findOwnOrder = async (orderId, pid) => {
    if (!isId(orderId) || !pid) return null;
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'paid' || order.razorpayPaymentId !== pid) return null;
    return order;
};

// POST /review  body: { orderId, pid, productId, rating, comment }
const addReview = async (req, res) => {
    try {
        const { orderId, pid, productId, comment } = req.body || {};
        const rating = Number(req.body?.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be a whole number from 1 to 5" });
        }
        const text = String(comment || '').trim();
        if (text.length > 500) return res.status(400).json({ error: "Comment is too long (max 500 characters)" });

        const order = await findOwnOrder(orderId, pid);
        if (!order) return res.status(404).json({ error: "Order not found" });
        if (order.deliveryStatus !== 'delivered') {
            return res.status(400).json({ error: "You can review items once the order is delivered" });
        }
        const item = order.items.find((it) => it.product && it.product.toString() === String(productId));
        if (!item) return res.status(400).json({ error: "This item is not part of the order" });

        const firstName = String(order.customer?.name || '').trim().split(/\s+/)[0] || 'Customer';
        try {
            const review = await Review.create({
                product: item.product, firm: order.firm, order: order._id,
                rating, comment: text, customerName: firstName
            });
            res.status(201).json(review);
        } catch (e) {
            if (e.code === 11000) return res.status(409).json({ error: "You already reviewed this item" });
            throw e;
        }
    } catch (error) {
        console.error("❌ addReview error:", error);
        res.status(500).json({ error: "Could not save review" });
    }
};

// GET /review/order/:orderId?pid=  -> which items of this order are already reviewed
const getOrderReviews = async (req, res) => {
    try {
        const order = await findOwnOrder(req.params.orderId, req.query.pid);
        if (!order) return res.status(404).json({ error: "Order not found" });
        const reviews = await Review.find({ order: order._id }).select('product rating comment');
        res.status(200).json({ reviews });
    } catch (error) {
        console.error("❌ getOrderReviews error:", error);
        res.status(500).json({ error: "Could not load reviews" });
    }
};

// GET /review/firm/:firmId -> { ratings: { [productId]: { avg, count } }, firm: { avg, count } }
const getFirmRatings = async (req, res) => {
    try {
        if (!isId(req.params.firmId)) return res.status(404).json({ error: "No firm found" });
        const firmId = new mongoose.Types.ObjectId(req.params.firmId);
        const rows = await Review.aggregate([
            { $match: { firm: firmId } },
            { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const ratings = {};
        let sum = 0, total = 0;
        for (const r of rows) {
            ratings[r._id.toString()] = { avg: Math.round(r.avg * 10) / 10, count: r.count };
            sum += r.avg * r.count;
            total += r.count;
        }
        res.status(200).json({
            ratings,
            firm: { avg: total ? Math.round((sum / total) * 10) / 10 : 0, count: total }
        });
    } catch (error) {
        console.error("❌ getFirmRatings error:", error);
        res.status(500).json({ error: "Could not load ratings" });
    }
};

// GET /review/product/:productId -> latest reviews (public)
const getProductReviews = async (req, res) => {
    try {
        if (!isId(req.params.productId)) return res.status(404).json({ error: "No product found" });
        const reviews = await Review.find({ product: req.params.productId })
            .sort({ createdAt: -1 }).limit(20).select('rating comment customerName createdAt');
        res.status(200).json({ reviews });
    } catch (error) {
        console.error("❌ getProductReviews error:", error);
        res.status(500).json({ error: "Could not load reviews" });
    }
};

module.exports = { addReview, getOrderReviews, getFirmRatings, getProductReviews };
