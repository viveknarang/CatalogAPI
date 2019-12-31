
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Order = new Schema({

    orderID: {
        type: String
    },
    orderDate: {
        type: Date
    },
    customerID: {
        type: String
    },
    isGift: {
        type: Boolean
    },
    productQuantity: {
        type: Map
    },
    productPrice: {
        type: Map
    },
    totalAmount: {
        type: Number
    },
    currency: {
        type: String
    },
    shippingAddress: {
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
    shippingDetails: {
        /*
            shippingPartner
            trackingNumber
            trackingLink
            labelCreationDate
            expectedDeliveryDate
        */
        type: Map
    },
    status: {
        type: String,
        enum: ['ORDERED', 'UNDER_PROCESSING', 'SHIPPED', 'CANCELED'],
        default: 'ORDERED'
    },

    _id: false

});

module.exports = mongoose.model('Order', Order);