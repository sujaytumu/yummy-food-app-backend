const mongoose = require('mongoose');

// NEW: stores each customer order + Razorpay payment state
const orderSchema = new mongoose.Schema({
    firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        price: Number,          // rupees, taken from DB (never from client)
        qty: Number
    }],
    amount: { type: Number, required: true },   // in paise
    currency: { type: String, default: 'INR' },
    customer: { name: String, phone: String, address: String, email: String }, // UPDATED: email added
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paymentMethod: String,   // NEW: upi / card / netbanking / wallet ...
    paymentDetail: String,   // NEW: human readable e.g. "VISA card ending 1111", "UPI: name@bank"
    paidAt: Date,            // NEW
    emailStatus: String,     // NEW: 'sent' | 'failed: reason' | 'skipped'
    emailSentTo: String,     // NEW
    emailCount: { type: Number, default: 0 } // NEW: how many receipt emails were sent (resend limit)
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
