var mongo = require('mongodb');

var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('CatalogAPI.properties');

// getting mongodb credentials ...
let baseURL = properties.get('mongodb.url');
let port = properties.get('mongodb.port');

let databaseName = properties.get('mongodb.database');
let collectionName = properties.get('mongodb.collection');

var MongoClient = mongo.MongoClient;

let url = "mongodb://" + baseURL + ":" + port + "/";

var _db;
var _collection;

module.exports = {

    connectToServer: function (callback) {

        console.log("Connecting to Mongo ...");

        MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {

            _db = client.db(databaseName);
            _collection = _db.collection(collectionName);

            return callback(err);
        });
    },

    getDb: function () {
        return _db;
    },

    getCollection: function () {
        return _collection;
    }

};