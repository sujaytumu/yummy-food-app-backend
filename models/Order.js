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
    amount: { type: Number, required: true },   // in paise (what the customer pays, after any discount)
    note: { type: String, maxlength: 200 },     // customer's special instructions
    promo: { code: String, discount: Number },  // discount in paise; present only when a promo code was applied
    currency: { type: String, default: 'INR' },
    customer: { name: String, phone: String, address: String, email: String }, // UPDATED: email added
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    // NEW: delivery lifecycle, separate from payment `status` above. Only moves forward.
    deliveryStatus: {
        type: String,
        enum: ['placed', 'preparing', 'out_for_delivery', 'delivered'],
        default: 'placed'
    },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now } }], // NEW
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paymentMethod: String,   // NEW: upi / card / netbanking / wallet ...
    paymentDetail: String,   // NEW: human readable e.g. "VISA card ending 1111", "UPI: name@bank"
    paidAt: Date,            // NEW
    emailStatus: String,     // NEW: 'sent' | 'failed: reason' | 'skipped'
    emailSentTo: String,     // NEW
    emailCount: { type: Number, default: 0 } // NEW: how many receipt emails were sent (resend limit)
}, { timestamps: true });

// NEW: indexes for the lookups the app does on every payment / vendor-orders / receipt request
orderSchema.index({ razorpayOrderId: 1 });                  // /payment/verify, /payment/report-failure
orderSchema.index({ firm: 1, status: 1, paidAt: -1 });      // vendor Orders tab (newest paid orders per restaurant)

module.exports = mongoose.model('Order', orderSchema);
