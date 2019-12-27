var mongoUtil = require('./Database');
var redis = require('redis');
var PropertiesReader = require('properties-reader');
var catalog = require('./CatalogApi');

var properties = PropertiesReader('CatalogAPI.properties');
let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');

let esURL = properties.get('search.elasticsearch.url');
let esPort = properties.get('search.elasticsearch.port');

let appName = properties.get('app.name');

const { Client } = require('@elastic/elasticsearch')
const esClient = new Client({ node: 'http://' + esURL + ":" + esPort })

console.clear();
console.log("--------------------------------------------------------------------------");
console.log("----------------------- " + appName + " - Welcome ! --------------------------");
console.log("--------------------------------------------------------------------------");
console.log('\x1b[31m', "\n PLEASE NOTE:\n IT IS VERY CRUCIAL FOR ALL THE SUPPORTING PLATFORM COMPONENTS \n TO FUNCTION NORMALLY FOR THIS API TO WORK PROPERLY.\n");

console.log('\x1b[34m', "Testing Elastic Search connectivity [1/3]:");
esClient.ping({}, {}, (err, result) => {

  if (err) {
    console.log('\x1b[31m', "Connection Attempt to Elastic Search Failed! Please see details below ...\n");
    console.log('\x1b[31m', err);
    return;
  }

  console.log('\x1b[32m', "Elastic Search is responding normally ... [OK] (" + esURL + ":" + esPort + ")");
  console.log('\x1b[34m', "Testing MongoDB connectivity [2/3]:");
  mongoUtil.connectToServer(function (err, client) {

    if (err) {
      console.log('\x1b[31m', "Connection attempt to MongoDB failed! Please see details below ...\n");
      console.log('\x1b[31m', err);
      return;
    }

    console.log('\x1b[32m', "MongoDB is responding normally... [OK] (" + mongoUtil.baseURL + ":" + mongoUtil.port + ")");
    console.log('\x1b[34m', "Testing Redis connectivity [3/3]:");
    let redisClient = redis.createClient(redisPort, redisHost);

    redisClient.set("TEST_KEY", "TEST_VALUE");
    redisClient.get("TEST_KEY", function (err, test_result) {

      if (err) {
        console.log('\x1b[31m', "Connection attempt to Redis failed! Please see details below ...\n");
        console.log('\x1b[31m', err);
        return;
      } else if (test_result == "TEST_VALUE") {
        console.log('\x1b[32m', "Redis is responding normally ... [OK] (" + redisHost + ":" + redisPort + ")\n");
        redisClient.del("TEST_KEY");
        catalog.main(redisClient, esClient);
        console.log('\x1b[0m', "--------------------------------------------------------------------------");
      }

    });

  });

});




