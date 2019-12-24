var mongoUtil = require('./Database');
var redis = require('redis');
var PropertiesReader = require('properties-reader');

var properties = PropertiesReader('CatalogAPI.properties');
let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');

var catalog = require('./CatalogApi');

mongoUtil.connectToServer(function (err, client) {

  if (err) console.log(err);

  let redisClient = redis.createClient(redisPort, redisHost);

  catalog.main(redisClient);

});