
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Product = new Schema({

    sku: {
        type: String
    },
    name: {
        type: String
    },
    groupID: {
        type: String
    },
    description: {
        type: String
    },
    regularPrice: {
        type: Number
    },
    promotionPrice: {
        type: Number
    },
    images: {
        type: Map
    },
    searchKeywords: {
        type: Array
    },
    quantity: {
        type: Number
    },
    active: {
        type: Boolean
    },
    category: {
        type: Array
    },
    attributes: {
        type: Map
    }

});

module.exports = mongoose.model('Product', Product);