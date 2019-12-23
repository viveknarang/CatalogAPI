
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductGroup = new Schema({

    ProductGroupID: {
        type: String
    },
    RegularPriceRange: {
        type: Array
    },
    PromotionPriceRange: {
        type: Array
    },
    Active: {
        type: Map
    },
    GroupProducts: {
        type: Map
    }

});

module.exports = mongoose.model('ProductGroup', ProductGroup);