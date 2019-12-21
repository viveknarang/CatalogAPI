// CatalogAPI

// Load in our dependencies
var express = require('express');
var jwt = require('jsonwebtoken');
var WebAppPort = 9005;
var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('CatalogAPI.properties');
let homepage = properties.get('API.homepage');
let catalogHomepage = properties.get('catalogAPI.homepage');
let adminHomepage = properties.get('adminAPI.homepage');
let customerCollection = properties.get('mongodb.internal.admin.collection');

var app = express();
var mongoUtil = require('./Database');
var compression = require('compression');
const { check, validationResult } = require('express-validator/check')
const Product = require('./Product');
var bodyParser = require('body-parser');
var path    = require("path");

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


function authenticate(req, res, next) {

    var token = req.query.token;
    jwt.verify(token, 'supersecret', function (err, decoded) {
        if (!err) {
            next();
        } else {
            res.send(err);
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

        console.log(cid);
        console.log(passcode);
        
        var db = mongoUtil.getDb();    
        var query = { "CustomerID" : cid, "CustomerPasscode" : passcode };
    
        db.collection(customerCollection).find(query).toArray(function (err, result) {


            res.setHeader('Content-Type', 'application/json');
            response = new Object();

            if(result.length == 1) {

                var token = jwt.sign({ username: "ado" }, 'supersecret', { expiresIn: 120 });
                response["accessToken"] = token; 
                response["validFor"] = "120";
                response["validForUnit"] = "seconds";
                response["responseCode"] = "OK"; 
                response["responseMessage"] = "Access with valid credentials ...";

            
            } else {

                response["responseCode"] = "INVALID"; 
                response["responseMessage"] = "Invalid credentials ...";

            }

            res.json(response);
            res.end();

        });

    
    });

    app.get('/catalog/product/get/:SKU',

        [
            check('SKU').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let sku = req.params.SKU;

            var db = mongoUtil.getDb();
            var collection = mongoUtil.getCollection();

            var query = { "ProductSKU": sku };

            collection.find(query).toArray(function (err, result) {

                res.setHeader('Content-Type', 'application/json');

                if (err) throw err;

                res.json(result);
                res.end();

            });

        });


    app.post('/catalog/product/add',

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
                        console.log("Document inserted");
                    });

                    response["responseCode"] = "OK"; 
                    response["response"] = product; 

                }  else {
 
                    response["responseCode"] = "INVALID"; 
                    response["responseMessage"] = "Product with the mentioned SKU already exists, if you want to update any field(s) please use the update endpoint ...";

                }  

                res.json(response);
                res.end();


            });

        });



    app.listen(WebAppPort, () => { console.log(`Listening port ${WebAppPort} ...`); });


};


module.exports.main = main;
