var mongoUtil = require('./Database');
var redis = require('redis');
var PropertiesReader = require('properties-reader');
var catalog = require('./CatalogApi');

var properties = PropertiesReader('CatalogAPI.properties');
let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');

let solrURL = properties.get('search.solr.url');
let solrPort = properties.get('search.solr.port');
let solrCollection = properties.get('search.solr.collection');

var solr = require('solr-client');

console.log("Connecting to Solr ...");
var solrClient = solr.createClient({host : solrURL, port : solrPort, core : solrCollection});

solrClient.ping(function(err,obj){
  if(err){
     
      console.log(err);
      return;

  }else{

    mongoUtil.connectToServer(function (err, client) {

      if (err) console.log(err);
    
      console.log("Connecting to redis ...");
      let redisClient = redis.createClient(redisPort, redisHost);
    
      catalog.main(redisClient, solrClient);
    
    });

  }
});