
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductGroup = new Schema({

    ProductGroupID: {
        type: String
    },
    ProductName: {
        type: String
    },
    ProductDescription: {
        type: String
    },    
    RegularPriceRange: {
        type: Array
    },
    PromotionPriceRange: {
        type: Array
    },
    Active: {
        type: Boolean
    },
    GroupProducts: {
        type: Map
    }

});

module.exports = mongoose.model('ProductGroup', ProductGroup);