
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Product = new Schema({

    ProductSKU: {
        type: String
    },
    ProductName: {
        type: String
    },
    ProductGroupID: {
        type: String
    },
    ProductDescription: {
        type: String
    },
    RegularPrice: {
        type: Number
    },
    PromotionPrice: {
        type: Number
    },
    Images: {
        type: Map
    },
    SearchKeywords: {
        type: Array
    },
    Quantity: {
        type: Number
    },
    Active: {
        type: Boolean
    },
    Category: {
        type: Array
    },
    ProductAttributes: {
        type: Map
    }

});

module.exports = mongoose.model('Product', Product);