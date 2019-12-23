// CatalogAPI

var express = require('express');
var jwt = require('jsonwebtoken');
var PropertiesReader = require('properties-reader');
var mongoUtil = require('./Database');
var compression = require('compression');
const { check, validationResult } = require('express-validator/check')
const Product = require('./Product');
const ProductGroup = require('./ProductGroup');
var bodyParser = require('body-parser');
var path = require("path");
var redis = require('redis');

var properties = PropertiesReader('CatalogAPI.properties');

var apiPort = properties.get('api.port');
let homepage = properties.get('api.homepage');
let catalogHomepage = properties.get('catalogAPI.homepage');
let adminHomepage = properties.get('adminAPI.homepage');
let customerCollection = properties.get('mongodb.collection.customers');
let productsCollection = properties.get('mongodb.collection.products');
let productGroupCollection = properties.get('mongodb.collection.productgroups');

let internalDB = properties.get('mongodb.internal.db');
let externalDB = properties.get('mongodb.external.db');

let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');
let jwtKey = properties.get('jwt.privateKey');
let jwtTokenExpiry = properties.get('jwt.token.expiry');
let apiResponseCodeOk = properties.get('api.response.code.ok');
let apiResponseCodeInvalid = properties.get('api.response.code.invalid');
let apiResponseCodeError = properties.get('api.response.code.error');
let apiVersion = properties.get('api.version');

var redisClient = redis.createClient(redisPort, redisHost);
var app = express();

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function authenticate(req, res, next) {

    let token = req.headers['x-access-token']; 

    jwt.verify(token, jwtKey, function (err, decoded) {

        if (!err) {
            next();
        } else {
            return res.json({
                responseCode: apiResponseCodeInvalid,
                message: "The token is not valid!"
              });
        }
    });

}

function validateInput(req, res, next) {

    const result = validationResult(req);
    if (result.isEmpty()) {
        return next();
    }

    res.status(422).json({ errors: result.array() });
}

function createProductGroup(sdbClient, scollection, product) {


    let productMap = new Map();

    subProduct = new Object()

    subProduct._id = product["_id"];
    subProduct.ProductSKU = product["ProductSKU"];
    subProduct.RegularPrice = product["RegularPrice"];
    subProduct.PromotionPrice = product["PromotionPrice"];
    subProduct.Images = product["Images"];
    subProduct.SearchKeywords = product["SearchKeywords"];
    subProduct.Quantity = product["Quantity"];
    subProduct.Active = product["Active"];
    subProduct.Category = product["Category"];
    subProduct.ProductAttributes = product["ProductAttributes"];
    

    productMap.set(product["ProductSKU"], subProduct);

    let pg = new ProductGroup({ 

                                ProductGroupID : product["ProductGroupID"], 
                                ProductName : product["ProductName"],
                                ProductDescription : product["ProductDescription"],
                                RegularPriceRange : [product["RegularPrice"], product["RegularPrice"]],
                                PromotionPriceRange : [product["PromotionPrice"], product["PromotionPrice"]],
                                Active : product["Active"],
                                GroupProducts : productMap,

                              });

    sdbClient.db(externalDB).collection(scollection).insertOne(pg, function(err, result) {

        if (err) throw err;

    });

}

function updateProductGroup(sdbClient, scollection, pgid, uProduct) {

    var query = { "ProductGroupID" : pgid };
    
    sdbClient.db(externalDB).collection(scollection).find(query).toArray(function (err, result) {

        if (err) throw err;

        if (result != null && result.length == 1) {

            let pg = new ProductGroup(result[0]);

            pg["GroupProducts"].delete(uProduct["ProductSKU"]);

            let productName = uProduct["ProductName"];
            let productDescription = uProduct["ProductDescription"];

            delete uProduct["ProductName"];
            delete uProduct["ProductDescription"];
            delete uProduct["ProductGroupID"];

            pg["GroupProducts"].set(uProduct["ProductSKU"], uProduct);

            let nrpmin = Number.MAX_VALUE;;
            let nrpmax = 0;
            let nppmin = Number.MAX_VALUE;;
            let nppmax = 0;
            let nActive = false;

            for (let product of pg["GroupProducts"].values()) {

                if (product["RegularPrice"] > nrpmax) {
                    nrpmax = product["RegularPrice"];
                }
                if (product["RegularPrice"] < nrpmin) {
                    nrpmin = product["RegularPrice"];
                }

                if (product["PromotionPrice"] > nppmax) {
                    nppmax = product["PromotionPrice"];
                }

                if (product["PromotionPrice"] < nppmin) {
                    nppmin = product["PromotionPrice"];
                }

                nActive = nActive || product["Active"];

            }

            pg["RegularPriceRange"][0] = nrpmin;
            pg["RegularPriceRange"][1] = nrpmax;
            
            pg["PromotionPriceRange"][0] = nppmin;
            pg["PromotionPriceRange"][1] = nppmax;

            pg["Active"] = nActive;

            pg["ProductName"] = productName;
            pg["ProductDescription"] = productDescription;
 
            sdbClient.db(externalDB).collection(scollection).updateOne(query, pg, function(err, result) {
                                
                if (err) throw err;

            });

        } else {
            return null;
        }

    });

}

var main = function () {

    var dbClient = mongoUtil.getClient();    

    app.get('/', (req, res) => {

        res.sendFile(path.join(__dirname + '/' + homepage));
    
    });
    
    app.get('/catalog', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/' + catalogHomepage));
    
    });
    
    app.get('/admin', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/' + adminHomepage));
    
    });
    
    app.get('/admin/'+ apiVersion +'/customer/login/', function (req, res) {
    
        let cid = req.query.customerID;
        let passcode = req.query.passcode;   
        
        var query = { "CustomerID" : cid, "CustomerPasscode" : passcode };
    
        dbClient.db(internalDB).collection(customerCollection).find(query).toArray(function (err, result) {


            res.setHeader('Content-Type', 'application/json');
            response = new Object();

            if(result.length == 1) {

                var token = jwt.sign({ customerSecret: result[0]["CustomerSecret"] }, jwtKey, { expiresIn: jwtTokenExpiry });
                
                redisClient.set(token, result[0]["CustomerName"] + "." + result[0]["CustomerSecret"]);
                redisClient.expire(token, jwtTokenExpiry);

                response["token"] = token; 
                response["validFor"] = jwtTokenExpiry;
                response["responseCode"] = apiResponseCodeOk; 
                response["responseMessage"] = "Access with valid credentials ...";
            
            } else {

                response["responseCode"] = apiResponseCodeInvalid; 
                response["responseMessage"] = "Invalid credentials ...";

            }

            res.json(response);
            res.end();

        });

    
    });


    app.get('/catalog/'+ apiVersion +'/product/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let sku = req.params.SKU;

            res.setHeader('Content-Type', 'application/json');

            redisClient.get(req.url, function (error, cache_result) {

                if (error) {
                    console.log(error);
                    throw error;
                }

                if (cache_result == null || cache_result.length == 0) {

                        redisClient.get(req.headers['x-access-token'], function(error, customer_domain) {

                            var query = { "ProductSKU": sku };

                            dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).find(query).toArray(function (err, result) {
            
           
                                if (err) throw err;
               
                                if (result.length == 1) {
                                    redisClient.set(req.url, JSON.stringify(result[0]));
                                    res.json(result[0]);
                                }

                                res.end();
                
                            });


                        }); 
           

                } else {

                            res.json(JSON.parse(cache_result));
                            res.end();

                }


            });


    });


    app.post('/catalog/'+ apiVersion +'/product',

        [
            check('ProductSKU').exists().withMessage("ProductSKU should be present ..."),
            check('ProductSKU').isLength({ min: 3 }).withMessage("ProductSKU Value needs to be more than 3 characters ..."),

            check('ProductName').exists().withMessage("ProductName should be present ..."),
            check('ProductName').isLength({ min: 3 }).withMessage("ProductName Value needs to be more than 3 characters ..."),

            check('ProductGroupID').exists().withMessage("ProductGroupID should be present ..."),
            check('ProductGroupID').isLength({ min: 3 }).withMessage("ProductGroupID Value needs to be more than 3 characters ..."),

            check('ProductDescription').exists().withMessage("ProductDesription should be present ..."),
            check('ProductDescription').isLength({ min: 3 }).withMessage("ProductDesription Value needs to be more than 3 characters ..."),

            check('RegularPrice').exists().withMessage("RegularPrice should be present ..."),
            check('RegularPrice').isDecimal().withMessage("RegularPrice should be numeric ..."),
            
            check('RegularPrice').custom(RegularPrice => {

                if (RegularPrice < 0) {
                  throw new Error('RegularPrice cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('PromotionPrice').exists().withMessage("PromotionPrice should be present ..."),
            check('PromotionPrice').isDecimal().withMessage("PromotionPrice should be numeric ..."),   
            
            check('PromotionPrice').custom(PromotionPrice => {

                if (PromotionPrice < 0) {
                  throw new Error('PromotionPrice cannot be less than 0 ...')
                } else {
                    return true
                }

            })

        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);

            redisClient.get(req.headers['x-access-token'], function(error, customer_domain) {

                var query = { "ProductSKU": req.body.ProductSKU };

                dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).find(query).toArray(function(err, result) {

                        res.setHeader('Content-Type', 'application/json');
                        response = new Object();

                        if(result.length == 0) {

                            dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).insertOne(product, function(err, result) {

                                if (err) throw err;

                                let Gquery = { "ProductGroupID": product["ProductGroupID"] };

                                dbClient.db(externalDB).collection(customer_domain + "." + productGroupCollection).find(Gquery).toArray(function (err, result) {

                                        if (result.length != 1) {
                                            createProductGroup(dbClient, customer_domain + "." + productGroupCollection, product);
                                        } 

                                });

                                response["responseCode"] = apiResponseCodeOk; 
                                response["response"] = product;
                                res.json(response);
                                res.end();
                
                            });



                        }  else {
        
                            response["responseCode"] = apiResponseCodeInvalid; 
                            response["responseMessage"] = "Product with the mentioned SKU already exists, if you want to update any field(s) please use the PUT HTTP method ...";
                            res.json(response);
                            res.end();
            
                        }  


                });

            });

    });

    
    app.put('/catalog/'+ apiVersion +'/product',

        [
            check('ProductSKU').exists().withMessage("ProductSKU should be present ..."),
            check('ProductSKU').isLength({ min: 3 }).withMessage("ProductSKU Value needs to be more than 3 characters ..."),

            check('ProductName').exists().withMessage("ProductName should be present ..."),
            check('ProductName').isLength({ min: 3 }).withMessage("ProductName Value needs to be more than 3 characters ..."),

            check('ProductGroupID').exists().withMessage("ProductGroupID should be present ..."),
            check('ProductGroupID').isLength({ min: 3 }).withMessage("ProductGroupID Value needs to be more than 3 characters ..."),

            check('ProductDescription').exists().withMessage("ProductDesription should be present ..."),
            check('ProductDescription').isLength({ min: 3 }).withMessage("ProductDesription Value needs to be more than 3 characters ..."),

            check('RegularPrice').exists().withMessage("RegularPrice should be present ..."),
            check('RegularPrice').isDecimal().withMessage("RegularPrice should be numeric ..."),

            check('RegularPrice').custom(RegularPrice => {

                if (RegularPrice < 0) {
                  throw new Error('RegularPrice cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('PromotionPrice').exists().withMessage("PromotionPrice should be present ..."),
            check('PromotionPrice').isDecimal().withMessage("PromotionPrice should be numeric ..."),   
            
            check('PromotionPrice').custom(PromotionPrice => {

                if (PromotionPrice < 0) {
                  throw new Error('PromotionPrice cannot be less than 0 ...')
                } else {
                    return true
                }

            })
            
        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);
            const dbProduct = null;

            redisClient.get(req.headers['x-access-token'], function(error, customer_domain) {


                    var query = { "ProductSKU": req.body.ProductSKU };

                    dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).find(query).toArray(function(err, result) {

                        res.setHeader('Content-Type', 'application/json');
                        response = new Object();

                        if(result.length == 0) {

                            dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).insertOne(product, function(err, result) {

                                if (err) throw err;

                                let Gquery = { "ProductGroupID": product["ProductGroupID"] };

                                dbClient.db(externalDB).collection(customer_domain + "." + productGroupCollection).find(Gquery).toArray(function (err, result) {

                                        if (result.length != 1) {
                                            createProductGroup(dbClient, customer_domain + "." + productGroupCollection, product);
                                        } 

                                });

                                response["responseCode"] = apiResponseCodeOk; 
                                response["response"] = product;
                                res.json(response);
                                res.end(); 

                            });

                        }  else {

                            product["_id"] = result[0]["_id"];

                            dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).updateOne(query, product, function(err, result) {
                                
                                if (err) throw err;
                                
                                redisClient.del(req.url + req.body.ProductSKU);
                                redisClient.set(req.url + req.body.ProductSKU, JSON.stringify(product));

                                let Gquery = { "ProductGroupID": product["ProductGroupID"] };

                                dbClient.db(externalDB).collection(customer_domain + "." + productGroupCollection).find(Gquery).toArray(function (err, result) {

                                        if (result.length == 1) {
                                            updateProductGroup(dbClient, customer_domain + "." + productGroupCollection, product["ProductGroupID"], product);
                                        } 

                                });
                                
                                response["responseCode"] = apiResponseCodeOk; 
                                response["responseMessage"] = "Product Updated";
                                response["response"] = product;
                                res.json(response);
                                res.end();

                            });



                        }  


                    });

            });        

    });


    app.delete('/catalog/'+ apiVersion +'/product/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            redisClient.get(req.headers['x-access-token'], function(error, customer_domain) {


                    let sku = req.params.SKU;
                    res.setHeader('Content-Type', 'application/json');
                    var query = { "ProductSKU": sku };
                    response = new Object();

                    dbClient.db(externalDB).collection(customer_domain + "." + productsCollection).deleteOne(query, function(err, result) {
                        if (err) throw err;

                        redisClient.del(req.url);

                        response["responseCode"] = apiResponseCodeOk; 
                        response["responseMessage"] = "Product Deleted";

                        res.json(response);
                        res.end();

                    });

            });
        
    });

    

    app.listen(apiPort, () => { console.log(`Listening port ${apiPort} ...`); });

};


module.exports.main = main;