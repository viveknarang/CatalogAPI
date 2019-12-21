// AdminAPI

// Load in our dependencies
var express = require('express');
var jwt = require('jsonwebtoken');
var WebAppPort = 9005;
var PropertiesReader = require('properties-reader');
var properties = PropertiesReader('CatalogAPI.properties');
var app = express();
var mongoUtil = require('./Database');
var compression = require('compression');
const { check, validationResult } = require('express-validator/check')

const Product = require('./Product');
const Customer = require('./Customer');

var bodyParser = require('body-parser');
var path    = require("path");



app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname + '/admin.html'));

});

app.get('/token', function (req, res) {
    var token = jwt.sign({ username: "ado" }, 'supersecret', { expiresIn: 120 });
    res.send(token)
});

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


    app.get('/products/:SKU/:LIMIT',

        [
            check('SKU').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let vx = req.params.SKU;
            let lmt = parseInt(req.params.LIMIT);

            console.log("MAIN:GET() Receiving Request on /products with SKU/LIMIT >> " + vx + " : " + lmt);

            var db = mongoUtil.getDb();
            var collection = mongoUtil.getCollection();

            var query = { "Region": vx };

            collection.find(query).limit(lmt).toArray(function (err, result) {

                res.setHeader('Content-Type', 'application/json');

                if (err) throw err;
                console.log("MONGO: RETURNING RESULT ...");

                res.json(result);
                res.end();

            });

        });


    app.post('/Admin/CreateCustomer/',

        [
            check('ProductSKU').exists().withMessage("ProductSKU should be present ..."),

/* 
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
 */           
            
        ],

        authenticate,

        validateInput,

        (req, res) => {

            const customer = new Customer(req.body);
            var db = mongoUtil.getDb();
            var collection = mongoUtil.getCollection();

            collection.insertOne(product, function(err, res) {
                if (err) throw err;
                console.log("Document inserted");
              });

            res.json(product);
            res.end();


        });



    app.listen(WebAppPort, () => { console.log(`Listening port ${WebAppPort} ...`); });


};


module.exports.main = main;
