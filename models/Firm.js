const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
    firmName: {
        type: String,
        required: true,
        unique: true
    },
    area: {
        type: String,
        required: true,
    },
    category: {
        type: [{
            type: String,
            enum: ['veg', 'non-veg']
        }]
    },
    region: {
        type: [{
            type: String,
            enum: ['south-indian', 'north-indian', 'chinese', 'bakery']
        }]
    },
    offer: {
        type: String,

    },
    image: {
        type: String
    },
    prepMinutes: {               // usual kitchen time, used for delivery estimates
        type: Number,
        default: 30,
        min: 5,
        max: 120
    },
    isOpen: {                    // vendor can close the restaurant; customers can't order while closed
        type: Boolean,
        default: true
    },
    vendor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor'
    }],
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }]
});

const Firm = mongoose.model('Firm', firmSchema);

module.exports = Firm