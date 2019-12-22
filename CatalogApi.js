// CatalogAPI

var express = require('express');
var jwt = require('jsonwebtoken');
var PropertiesReader = require('properties-reader');
var mongoUtil = require('./Database');
var compression = require('compression');
const { check, validationResult } = require('express-validator/check')
const Product = require('./Product');
var bodyParser = require('body-parser');
var path = require("path");
var redis = require('redis');

var properties = PropertiesReader('CatalogAPI.properties');

var WebAppPort = properties.get('api.port');
let homepage = properties.get('API.homepage');
let catalogHomepage = properties.get('catalogAPI.homepage');
let adminHomepage = properties.get('adminAPI.homepage');
let customerCollection = properties.get('mongodb.internal.admin.collection');
let redisHost = properties.get('redis.host');
let redisPort = properties.get('redis.port');
let jwtKey = properties.get('jwt.key');
let jwtTokenExpiry = properties.get('jwt.token.expiry');
let apiResponseCodeOk = properties.get('api.response.code.ok');
let apiResponseCodeInvalid = properties.get('api.response.code.invalid');
let apiResponseCodeError = properties.get('api.response.code.error');

var client = redis.createClient(redisPort, redisHost);
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

var main = function () {


    app.get('/', (req, res) => {

        res.sendFile(path.join(__dirname + '/' + homepage));
    
    });
    
    app.get('/catalog', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/' + catalogHomepage));
    
    });
    
    app.get('/admin', (req, res) => {
    
        res.sendFile(path.join(__dirname + '/' + adminHomepage));
    
    });
    
    app.get('/admin/customer/login/', function (req, res) {
    
        let cid = req.query.customerID;
        let passcode = req.query.passcode;   
        
        var db = mongoUtil.getDb();    
        var query = { "CustomerID" : cid, "CustomerPasscode" : passcode };
    
        db.collection(customerCollection).find(query).toArray(function (err, result) {


            res.setHeader('Content-Type', 'application/json');
            response = new Object();

            if(result.length == 1) {

                var token = jwt.sign({ username: cid }, jwtKey, { expiresIn: jwtTokenExpiry });
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

    app.get('/catalog/product/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let sku = req.params.SKU;
            res.setHeader('Content-Type', 'application/json');

            client.get(sku, function (error, result) {

                if (error) {
                    console.log(error);
                    throw error;
                }

                if (result == null) {

                        var db = mongoUtil.getDb();
                        var collection = mongoUtil.getCollection();
            
                        var query = { "ProductSKU": sku };
            
                        collection.find(query).toArray(function (err, result) {
            
           
                            if (err) throw err;
            
                            client.set(sku, JSON.stringify(result));
            
                            res.json(result);
                            res.end();
            
                        });

                } else {

                            res.json(JSON.parse(result));
                            res.end();

                }


            });


        });


    app.post('/catalog/product',

        [
            check('ProductSKU').exists().withMessage("ProductSKU should be present ..."),
            check('ProductSKU').isLength({ min: 3 }).withMessage("ProductSKU Value needs to be more than 3 characters ..."),

            check('ProductName').exists().withMessage("ProductName should be present ..."),
            check('ProductName').isLength({ min: 3 }).withMessage("ProductName Value needs to be more than 3 characters ..."),

            check('ProductGroupID').exists().withMessage("ProductGroupID should be present ..."),
            check('ProductGroupID').isLength({ min: 3 }).withMessage("ProductGroupID Value needs to be more than 3 characters ..."),

            check('ProductDesription').exists().withMessage("ProductDesription should be present ..."),
            check('ProductDesription').isLength({ min: 3 }).withMessage("ProductDesription Value needs to be more than 3 characters ..."),

            check('RegularPrice').exists().withMessage("RegularPrice should be present ..."),
            check('RegularPrice').isDecimal().withMessage("RegularPrice should be numeric ..."),

            check('PromotionPrice').exists().withMessage("PromotionPrice should be present ..."),
            check('PromotionPrice').isDecimal().withMessage("PromotionPrice should be numeric ..."),               
        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);
            var db = mongoUtil.getDb();
            var collection = mongoUtil.getCollection();

            var query = { "ProductSKU": req.body.ProductSKU };

            collection.find(query).toArray(function(err, result) {

                res.setHeader('Content-Type', 'application/json');
                response = new Object();

                if(result.length == 0) {

                    collection.insertOne(product, function(err, res) {

                        if (err) throw err;

                    });

                    response["responseCode"] = apiResponseCodeOk; 
                    response["response"] = product; 

                }  else {
 
                    response["responseCode"] = apiResponseCodeInvalid; 
                    response["responseMessage"] = "Product with the mentioned SKU already exists, if you want to update any field(s) please use the update endpoint ...";

                }  

                res.json(response);
                res.end();


            });

    });

    
    app.put('/catalog/product',

        [
            check('ProductSKU').exists().withMessage("ProductSKU should be present ..."),
            check('ProductSKU').isLength({ min: 3 }).withMessage("ProductSKU Value needs to be more than 3 characters ..."),

            check('ProductName').exists().withMessage("ProductName should be present ..."),
            check('ProductName').isLength({ min: 3 }).withMessage("ProductName Value needs to be more than 3 characters ..."),

            check('ProductGroupID').exists().withMessage("ProductGroupID should be present ..."),
            check('ProductGroupID').isLength({ min: 3 }).withMessage("ProductGroupID Value needs to be more than 3 characters ..."),

            check('ProductDesription').exists().withMessage("ProductDesription should be present ..."),
            check('ProductDesription').isLength({ min: 3 }).withMessage("ProductDesription Value needs to be more than 3 characters ..."),

            check('RegularPrice').exists().withMessage("RegularPrice should be present ..."),
            check('RegularPrice').isDecimal().withMessage("RegularPrice should be numeric ..."),

            check('PromotionPrice').exists().withMessage("PromotionPrice should be present ..."),
            check('PromotionPrice').isDecimal().withMessage("PromotionPrice should be numeric ..."),               
        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);
            const dbProduct = null;

            var db = mongoUtil.getDb();
            var collection = mongoUtil.getCollection();

            var query = { "ProductSKU": req.body.ProductSKU };

            collection.find(query).toArray(function(err, result) {

                res.setHeader('Content-Type', 'application/json');
                response = new Object();

                if(result.length == 0) {

                    collection.insertOne(product, function(err, res) {

                        if (err) throw err;

                    });

                    response["responseCode"] = apiResponseCodeOk; 
                    response["response"] = product; 

                }  else {

                    product["_id"] = result[0]["_id"];
                    console.log(product);

                    collection.updateOne(query, product, function(err, res) {
                        
                        if (err) throw err;
                    
                    });

                    response["responseCode"] = apiResponseCodeOk; 
                    response["responseMessage"] = "Product Updated";
                    response["response"] = product;

                }  

                res.json(response);
                res.end();

            });

    });


    app.listen(WebAppPort, () => { console.log(`Listening port ${WebAppPort} ...`); });


};


module.exports.main = main;