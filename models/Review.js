const mongoose = require('mongoose');

// One review per product per delivered order.
const reviewSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500, default: '' },
    customerName: { type: String, default: 'Customer' } // first name only, shown publicly
}, { timestamps: true });

reviewSchema.index({ order: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
