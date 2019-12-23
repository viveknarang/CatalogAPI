
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Customer = new Schema({

    id: {
        type: String
    },
    name: {
        type: String
    },
    apiKey: {
        type: String
    },
    secret: {
        type: String
    },
    active: {
        type: Boolean
    },
    attributes: {
        type: Map
    }

});

module.exports = mongoose.model('Customer', Customer);