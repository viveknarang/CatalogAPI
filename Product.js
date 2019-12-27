
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
        type: Array
    },
    searchKeywords: {
        type: Array
    },
    quantity: {
        type: Number
    },
    category: {
        type: Array
    },
    color: {
        type: String
    },
    brand: {
        type: String
    },
    size: {
        type: String
    },
    active: {
        type: Boolean
    },
    attributes: {
        type: Map
    },
    isMain: {
        type: Boolean,
        default: 'true'
    },

    _id: false

});

module.exports = mongoose.model('Product', Product);