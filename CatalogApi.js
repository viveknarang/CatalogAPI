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
let homepage = properties.get('docs.api.homepage');
let catalogHomepage = properties.get('docs.api.catalog.homepage');
let adminHomepage = properties.get('docs.api.admin.homepage');
let customerCollection = properties.get('mongodb.collection.customers');
let productsCollection = properties.get('mongodb.collection.products');
let productGroupsCollection = properties.get('mongodb.collection.productgroups');
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
                message: "The token is not valid (anymore)! If you think that your token is expired please use the login endpoint to get a new token for your API calls ..."
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

    subProduct = new Object();

    subProduct.sku = product["sku"];
    subProduct.regularPrice = product["regularPrice"];
    subProduct.promotionPrice = product["promotionPrice"];
    subProduct.images = product["images"];
    subProduct.searchKeywords = product["searchKeywords"];
    subProduct.quantity = product["quantity"];
    subProduct.active = product["active"];
    subProduct.category = product["category"];
    subProduct.attributes = product["attributes"];

    productMap.set(product["sku"], subProduct);

    let pg = new ProductGroup({ 

                                groupID : product["groupID"], 
                                name : product["name"],
                                description : product["description"],
                                regularPriceRange : [product["regularPrice"], product["regularPrice"]],
                                promotionPriceRange : [product["promotionPrice"], product["promotionPrice"]],
                                active : product["active"],
                                productSKUs : [Product["sku"]],
                                products : productMap,

                              });

    sdbClient.db(externalDB).collection(scollection).insertOne(pg, function(err, result) {

        if (err) throw err;

    });

}


function updateProductGroup(sdbClient, scollection, pgid, uProduct) {

    var query = { "groupID" : pgid };
    
    sdbClient.db(externalDB).collection(scollection).find(query).toArray(function (err, result) {

        if (err) throw err;

        if (result != null && result.length == 1) {

            let pg = new ProductGroup(result[0]);

            pg["products"].delete(uProduct["sku"]);

            let productName = uProduct["name"];
            let productDescription = uProduct["description"];

            subProduct = new Object()

            subProduct.sku = uProduct["sku"];
            subProduct.regularPrice = uProduct["regularPrice"];
            subProduct.promotionPrice = uProduct["promotionPrice"];
            subProduct.images = uProduct["images"];
            subProduct.searchKeywords = uProduct["searchKeywords"];
            subProduct.quantity = uProduct["quantity"];
            subProduct.active = uProduct["active"];
            subProduct.category = uProduct["category"];
            subProduct.attributes = uProduct["attributes"];

            pg["products"].set(uProduct["sku"], subProduct);

            let nrpmin = Number.MAX_VALUE;;
            let nrpmax = 0;
            let nppmin = Number.MAX_VALUE;;
            let nppmax = 0;
            let nActive = false;
            let nProductSKUs = [];

            for (let product of pg["products"].values()) {

                if (product["regularPrice"] > nrpmax) {
                    nrpmax = product["regularPrice"];
                }
                if (product["regularPrice"] < nrpmin) {
                    nrpmin = product["regularPrice"];
                }

                if (product["promotionPrice"] > nppmax) {
                    nppmax = product["promotionPrice"];
                }

                if (product["promotionPrice"] < nppmin) {
                    nppmin = product["promotionPrice"];
                }

                nActive = nActive || product["active"];
                nProductSKUs.push(String(product["sku"]));

            }

            pg["regularPriceRange"][0] = nrpmin;
            pg["regularPriceRange"][1] = nrpmax;
            
            pg["promotionPriceRange"][0] = nppmin;
            pg["promotionPriceRange"][1] = nppmax;

            pg["active"] = nActive;
            pg["name"] = productName;
            pg["description"] = productDescription;
            pg["productSKUs"] = [...new Set(nProductSKUs)]; 
 
            sdbClient.db(externalDB).collection(scollection).updateOne(query, pg, function(err, result) {
                                
                if (err) throw err;

            });

        } else {
            return null;
        }

    });

}

function deleteProductInProductGroup(dbClient, pgcollection, pgid, sku, response, res) {

    var query = { "groupID" : pgid };
        
    dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {

        if (err) throw err;

        let products = result[0]["products"];
        delete products[sku];

        if (Object.keys(products).length == 0) {

            dbClient.db(externalDB).collection(pgcollection).deleteOne(query, function(err, result) {
                                    
                if (err) throw err;

                response["responseCode"] = apiResponseCodeOk; 
                response["responseMessage"] = "Since the product group had only one product left the entire product group is now deleted ...";
                res.json(response);
                res.end();

            });

            return;

        }


        let pg = new ProductGroup(result[0]);
        pg["products"] = products;

        let nrpmin = Number.MAX_VALUE;;
        let nrpmax = 0;
        let nppmin = Number.MAX_VALUE;;
        let nppmax = 0;
        let nActive = false;
        let nProductSKUs = [];

        for (let product of pg["products"].values()) {

            if (product["regularPrice"] > nrpmax) {
                nrpmax = product["regularPrice"];
            }
            if (product["regularPrice"] < nrpmin) {
                nrpmin = product["regularPrice"];
            }

            if (product["promotionPrice"] > nppmax) {
                nppmax = product["promotionPrice"];
            }

            if (product["promotionPrice"] < nppmin) {
                nppmin = product["promotionPrice"];
            }

            nActive = nActive || product["active"];
            nProductSKUs.push(String(product["sku"]));

        }

        pg["regularPriceRange"][0] = nrpmin;
        pg["regularPriceRange"][1] = nrpmax;        
        pg["promotionPriceRange"][0] = nppmin;
        pg["promotionPriceRange"][1] = nppmax;
        pg["active"] = nActive;
        pg["productSKUs"] = [...new Set(nProductSKUs)];

        let setQuery = { $set: { "products" : products, 
                                 "productSKUs" : pg["productSKUs"] , 
                                 "active" : pg["active"], 
                                 "promotionPriceRange" : pg["promotionPriceRange"], 
                                 "regularPriceRange" : pg["regularPriceRange"]} };

            dbClient.db(externalDB).collection(pgcollection).updateOne(query, setQuery, function(err, result) {
                                        
                if (err) throw err;
                res.json(response);
                res.end();
                return;

            });


    });


}


var main = function () {

    var dbClient = mongoUtil.getClient();    

    app.get('/', (req, res) => {

        res.sendFile(path.join(__dirname + '/docs/' + homepage));
    
    });
    
    app.get('/catalog', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/docs/' + catalogHomepage));
    
    });
    
    app.get('/admin', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/docs/' + adminHomepage));
    
    });
    
    app.get('/admin/'+ apiVersion +'/customers/login/', function (req, res) {
    
        let id = req.query.id;
        let apiKey = req.query.apiKey;   
        
        var query = { "id" : id, "apiKey" : apiKey };
    
        dbClient.db(internalDB).collection(customerCollection).find(query).toArray(function (err, result) {

            if (err) throw err;

            res.setHeader('Content-Type', 'application/json');
            response = new Object();

            if(result.length == 1) {

                var token = jwt.sign({ secret : result[0]["secret"] }, jwtKey, { expiresIn: jwtTokenExpiry });

                redisClient.set(token, result[0]["name"] + "." + result[0]["secret"]);
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


    app.get('/catalog/'+ apiVersion +'/productgroups/:ID',

        [
            check('ID').exists().withMessage("ID should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let id = req.params.ID;

            res.setHeader('Content-Type', 'application/json');

            redisClient.get(req.url, function (error, cache_result) {

                if (error) {
                    throw error;
                }

                if (cache_result == null || cache_result.length == 0) {

                        redisClient.get(req.headers['x-access-token'], function(error, customer_domain) {

                            var query = { $or : [ {productSKUs : { $elemMatch : { $eq : id } } } , { groupID : id } ]};
                            let pgcollection = customer_domain + "." + productGroupsCollection;

                            dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {
           
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


    app.get('/catalog/'+ apiVersion +'/products/:SKU',

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

                            var query = { "sku": sku };
                            let pcollection = customer_domain + "." + productsCollection;

                            dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {            
           
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


    app.post('/catalog/'+ apiVersion +'/products',

        [
            check('sku').exists().withMessage("SKU should be present ..."),
            check('sku').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),

            check('name').exists().withMessage("Product Name should be present ..."),
            check('name').isLength({ min: 3 }).withMessage("Product Name Value needs to be more than 3 characters ..."),

            check('groupID').exists().withMessage("Product Group ID should be present ..."),
            check('groupID').isLength({ min: 3 }).withMessage("Product Group ID Value needs to be more than 3 characters ..."),

            check('description').exists().withMessage("Product Desription should be present ..."),
            check('description').isLength({ min: 3 }).withMessage("Product Desription Value needs to be more than 3 characters ..."),

            check('regularPrice').exists().withMessage("Regular Price should be present ..."),
            check('regularPrice').isDecimal().withMessage("Regular Price should be numeric ..."),
            
            check('regularPrice').custom(regularPrice => {

                if (regularPrice < 0) {
                  throw new Error('Regular Price cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('promotionPrice').exists().withMessage("Promotion Price should be present ..."),
            check('promotionPrice').isDecimal().withMessage("Promotion Price should be numeric ..."),   
            
            check('promotionPrice').custom(promotionPrice => {

                if (promotionPrice < 0) {
                  throw new Error('Promotion Price cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('quantity').exists().withMessage("Quantity should be present ..."),
            check('quantity').isInt().withMessage("Quantity should be integer ..."),
            
            check('quantity').custom(quantity => {

                if (quantity < 0) {
                  throw new Error('Quantity cannot be less than 0 ...')
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

                var query = { "sku": req.body.sku };
                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;

                dbClient.db(externalDB).collection(pcollection).find(query).toArray(function(err, result) {

                    if (err) throw err;

                        res.setHeader('Content-Type', 'application/json');
                        response = new Object();

                        if(result.length == 0) {

                            dbClient.db(externalDB).collection(pcollection).insertOne(product, function(err, result) {

                                if (err) throw err;

                                let Gquery = { "groupID": product["groupID"] };

                                dbClient.db(externalDB).collection(pgcollection).find(Gquery).toArray(function (err, result) {

                                    if (err) throw err;

                                        if (result.length != 1) {
                                            createProductGroup(dbClient, pgcollection, product);
                                        } else {
                                            updateProductGroup(dbClient, pgcollection, product["groupID"], product);
                                        }

                                });

                                response["responseCode"] = apiResponseCodeOk; 
                                response["response"] = product;
                                res.json(response);
                                res.end();
                
                            });



                        }  else {
        
                            response["responseCode"] = apiResponseCodeInvalid; 
                            response["responseMessage"] = "Product with the mentioned SKU already exists, if you want to update any field(s) please use the PUT method ...";
                            res.json(response);
                            res.end();
            
                        }  


                });

            });

    });

    
    app.put('/catalog/'+ apiVersion +'/products',

        [
            check('sku').exists().withMessage("SKU should be present ..."),
            check('sku').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),

            check('name').exists().withMessage("Product Name should be present ..."),
            check('name').isLength({ min: 3 }).withMessage("Product Name Value needs to be more than 3 characters ..."),

            check('groupID').exists().withMessage("Product Group ID should be present ..."),
            check('groupID').isLength({ min: 3 }).withMessage("Product Group ID Value needs to be more than 3 characters ..."),

            check('description').exists().withMessage("Product Desription should be present ..."),
            check('description').isLength({ min: 3 }).withMessage("Product Desription Value needs to be more than 3 characters ..."),

            check('regularPrice').exists().withMessage("Regular Price should be present ..."),
            check('regularPrice').isDecimal().withMessage("Regular Price should be numeric ..."),
            
            check('regularPrice').custom(regularPrice => {

                if (regularPrice < 0) {
                  throw new Error('Regular Price cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('promotionPrice').exists().withMessage("Promotion Price should be present ..."),
            check('promotionPrice').isDecimal().withMessage("Promotion Price should be numeric ..."),   
            
            check('promotionPrice').custom(promotionPrice => {

                if (promotionPrice < 0) {
                  throw new Error('Promotion Price cannot be less than 0 ...')
                } else {
                    return true
                }

            }),

            check('quantity').exists().withMessage("Quantity should be present ..."),
            check('quantity').isInt().withMessage("Quantity should be integer ..."),
            
            check('quantity').custom(quantity => {

                if (quantity < 0) {
                  throw new Error('Quantity cannot be less than 0 ...')
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

            redisClient.get(req.headers['x-access-token'], function(err, customer_domain) {

                if (err) throw err;

                    var query = { "sku": req.body.sku };
                    let pcollection = customer_domain + "." + productsCollection;
                    let pgcollection = customer_domain + "." + productGroupsCollection;

                    dbClient.db(externalDB).collection(pcollection).find(query).toArray(function(err, result) {

                        if (err) throw err;

                        res.setHeader('Content-Type', 'application/json');
                        response = new Object();

                        if(result.length == 0) {

                            dbClient.db(externalDB).collection(pcollection).insertOne(product, function(err, result) {

                                if (err) throw err;

                                let gQuery = { "groupID": product["groupID"] };

                                dbClient.db(externalDB).collection(pgcollection).find(gQuery).toArray(function (err, result) {

                                    if (err) throw err;

                                        if (result.length != 1) {
                                            createProductGroup(dbClient, pgcollection, product);
                                        } else {
                                            updateProductGroup(dbClient, pgcollection, product["groupID"], product);
                                        } 

                                });

                                response["responseCode"] = apiResponseCodeOk; 
                                response["response"] = product;
                                res.json(response);
                                res.end(); 

                            });

                        }  else {

                            product["_id"] = result[0]["_id"];

                            dbClient.db(externalDB).collection(pcollection).updateOne(query, product, function(err, result) {
                                
                                if (err) throw err;
                                
                                redisClient.del(req.url + req.body.sku);
                                redisClient.set(req.url + req.body.sku, JSON.stringify(product));

                                let gQuery = { "groupID": product["groupID"] };

                                dbClient.db(externalDB).collection(pgcollection).find(gQuery).toArray(function (err, result) {

                                    if (err) throw err;

                                        if (result.length == 1) {
                                            updateProductGroup(dbClient, pgcollection, product["groupID"], product);
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


    app.delete('/catalog/'+ apiVersion +'/products/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            redisClient.get(req.headers['x-access-token'], function(err, customer_domain) {

                if (err) throw err;
                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;

                
                    let sku = req.params.SKU;
                    res.setHeader('Content-Type', 'application/json');
                    var query = { "sku" : sku };
                    response = new Object();

                    dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {      
                        
                        if (err) throw err;
                         
                        if (result == null || result.length == 0) {

                            response["responseCode"] = apiResponseCodeInvalid; 
                            response["responseMessage"] = "Product with SKU " + sku + " does not exist ...";
                            res.json(response);
                            res.end();
                            return;

                        }

                        let pgid = result[0]["groupID"];

                        dbClient.db(externalDB).collection(pcollection).deleteOne(query, function(err, result) {

                            if (err) throw err;
                            
                            redisClient.del(req.url);

                            response["responseCode"] = apiResponseCodeOk; 
                            response["responseMessage"] = "Product with SKU " + sku + " deleted and the product group is updated ...";

                            deleteProductInProductGroup(dbClient, pgcollection, pgid, sku, response, res);
                            return;

                        });                                

                    });

            });
        
    });

    app.delete('/catalog/'+ apiVersion +'/productgroups/:PGID',

        [
            check('PGID').exists().withMessage("PGID should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            redisClient.get(req.headers['x-access-token'], function(err, customer_domain) {

                if (err) throw err;

                    let pgid = req.params.PGID;
                    res.setHeader('Content-Type', 'application/json');
                    var query = { "groupID" : pgid };
                    response = new Object();

                    let pcollection = customer_domain + "." + productsCollection;
                    let pgcollection = customer_domain + "." + productGroupsCollection;


                    dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {

                        if (err) throw err;

                        if (result == null || result.length == 0) {

                            response["responseCode"] = apiResponseCodeInvalid; 
                            response["responseMessage"] = "Product Group with ID " + pgid + " does not exist ...";
                            res.json(response);
                            res.end();
                            return;

                        }

                        let pskus = result[0]["productSKUs"];

                        var pdelQuery = {'sku': { '$in' : pskus }};

                        dbClient.db(externalDB).collection(pcollection).deleteMany(pdelQuery, function(err, result) {


                            if (err) throw err;

                                dbClient.db(externalDB).collection(pgcollection).deleteOne(query, function(err, result) {
                                    
                                    if (err) throw err;

                                    redisClient.del(req.url);

                                    response["responseCode"] = apiResponseCodeOk; 
                                    response["responseMessage"] = "Product group is now deleted ...";

                                    res.json(response);
                                    res.end();

                                });


                            });


                        });


            });
        
    });    
    

    app.listen(apiPort, () => { console.log(`Listening port ${apiPort} ...`); });

};


module.exports.main = main;