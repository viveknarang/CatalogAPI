
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Customer = new Schema({

    CustomerID: {
        type: String
    },
    CustomerName: {
        type: String
    },
    CustomerPasscode: {
        type: String
    },
    CustomerSecret: {
        type: String
    },
    Active: {
        type: Boolean
    },
    CustomerAttributes: {
        type: Map
    }

});

module.exports = mongoose.model('Customer', Customer);