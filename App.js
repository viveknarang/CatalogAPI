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


    console.log("Connecting to Elastic Search ...");
    esClient.ping({},{}, (err, result) => {

          if (err) {
            console.log(err)
            return;
          }
          console.log("Elastic Search is responsing ...");
          console.log("Connecting to MongoDB ...");
          mongoUtil.connectToServer(function (err, client) {

            if (err) console.log(err);
            console.log("MongoDB is responsing ...");
            console.log("Finally, connecting to redis ...");
            let redisClient = redis.createClient(redisPort, redisHost);
            
            catalog.main(redisClient, esClient);
          
          });
  
    });




