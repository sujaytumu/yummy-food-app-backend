const mongoose = require('mongoose');

// A discount code created by a vendor for their own restaurant.
const promoSchema = new mongoose.Schema({
    firm: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true },
    code: { type: String, required: true },                         // stored upper-case, no spaces
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 1 },                // percent (1-90) or rupees
    minOrder: { type: Number, default: 0 },                         // rupees
    maxDiscount: { type: Number, default: 0 },                      // rupees, percent codes only (0 = no cap)
    usageLimit: { type: Number, default: 0 },                       // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    expiresAt: Date,
    active: { type: Boolean, default: true }
}, { timestamps: true });

promoSchema.index({ firm: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Promo', promoSchema);
