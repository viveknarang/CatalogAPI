
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductGroup = new Schema({

    groupID: {
        type: String
    },
    name: {
        type: String
    },
    description: {
        type: String
    },
    regularPriceMin: {
        type: Number
    },
    regularPriceMax: {
        type: Number
    },
    promotionPriceMin: {
        type: Number
    },
    promotionPriceMax: {
        type: Number
    },
    active: {
        type: Boolean
    },
    productSKUs: {
        type: Array
    },
    colors: {
        type: Array
    },
    brands: {
        type: Array
    },
    sizes: {
        type: Array
    },
    images: {
        type: Array
    },
    searchKeywords: {
        type: Array
    },
    category: {
        type: Array
    },
    products: {
        type: Map
    },

    _id: false

});

module.exports = mongoose.model('ProductGroup', ProductGroup);