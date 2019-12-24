
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
    regularPriceRange: {
        type: Array
    },
    promotionPriceRange: {
        type: Array
    },
    active: {
        type: Boolean
    },
    productSKUs: {
        type: Array
    },
    products: {
        type: Map
    }

});

module.exports = mongoose.model('ProductGroup', ProductGroup);