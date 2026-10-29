const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    firm: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm'
    }],
    // Long-lived login sessions. Only a SHA-256 hash of each token is stored (see utils/tokens.js).
    refreshTokens: [{
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true }
    }]
});

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;