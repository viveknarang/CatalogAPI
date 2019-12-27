var mongoUtil = require('./Database');
var redis = require('redis');
var PropertiesReader = require('properties-reader');
var catalog = require('./CatalogApi');

var properties = PropertiesReader('CatalogAPI.properties');
let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');

let esURL = properties.get('search.elasticsearch.url');
let esPort = properties.get('search.elasticsearch.port');

const { Client } = require('@elastic/elasticsearch')
const esClient = new Client({ node: 'http://' + esURL + ":" + esPort })


console.log("Testing Elastic Search connectivity ...");
esClient.ping({}, {}, (err, result) => {

  if (err) {
    console.log(err)
    return;
  }

  console.log("Elastic Search is responding ...");
  console.log("Testing MongoDB connectivity ...");
  mongoUtil.connectToServer(function (err, client) {

    if (err) console.log(err);
    console.log("MongoDB is responsing ...");
    console.log("Testing Redis connectivity ...");
    let redisClient = redis.createClient(redisPort, redisHost);

    redisClient.set("TEST_KEY", "TEST_VALUE");
    redisClient.get("TEST_KEY", function (err, test_result) {

      if (err) {
        console.log(err);
        return;
      } else if (test_result == "TEST_VALUE") {
        console.log("Redis is working normally ...");
        redisClient.del("TEST_KEY");
        catalog.main(redisClient, esClient);
      }

    });

  });

});




