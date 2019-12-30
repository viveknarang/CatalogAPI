var mongo = require('mongodb');

var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('CatalogAPI.properties');

let baseURL = properties.get('mongodb.url');
let port = properties.get('mongodb.port');

var MongoClient = mongo.MongoClient;

let url = "mongodb://" + baseURL + ":" + port + "/";

var _client;

module.exports = {

    connectToServer: function (callback) {

        MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, function (err, client) {

            _client = client;

            return callback(err);
        });

    },

    getClient: function () {
        return _client;
    },

    baseURL,

    port

};