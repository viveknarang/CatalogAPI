
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentOption = new Schema({

    cardName: {
        type: String
    },
    cardNumber: {
        type: String
    },
    expiryMM: {
        type: String
    },
    expiryYY: {
        type: String
    },
    securityCode: {
        type: String
    },
    pincode: {
        type: String
    },
    billingAddress: {
        /* 
            firstName
            lastName
            email
            phoneNumber
            addressLineOne
            addressLineTwo
            city
            state
            country
            pincode
        */ 
        type: Map
    },
    defaultShippingAddress: {
        /* 
            firstName
            lastName
            email
            phoneNumber
            addressLineOne
            addressLineTwo
            city
            state
            country
            pincode
        */ 
        type: Map
    },
    verified: {
        type: Boolean,
        default: false
    }
    
});

const Consumer = new Schema({

    id: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    email: {
        type: String
    },
    phoneNumber: {
        type: String
    },

    paymentDetails: [PaymentOption],
    
    active: {
        type: Boolean
    },
    updated: {
        type: Date
    }

});

module.exports = mongoose.model('Consumer', Consumer);