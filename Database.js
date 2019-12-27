var mongo = require('mongodb');

var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('CatalogAPI.properties');

// getting mongodb credentials ...
let baseURL = properties.get('mongodb.url');
let port = properties.get('mongodb.port');

let databaseName = properties.get('mongodb.database');

var MongoClient = mongo.MongoClient;

let url = "mongodb://" + baseURL + ":" + port + "/";

var _client;

module.exports = {

    connectToServer: function (callback) {

        MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {

            _client = client;

            return callback(err);
        });

    },

    getClient: function () {
        return _client;
    },

};