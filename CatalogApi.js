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
let jwtKey = properties.get('jwt.privateKey');
let jwtTokenExpiry = properties.get('jwt.token.expiry');
let apiResponseCodeOk = properties.get('api.response.code.ok');
let apiResponseCodeInvalid = properties.get('api.response.code.invalid');
let apiResponseCodeError = properties.get('api.response.code.error');
let apiVersion = properties.get('api.version');
let apiResponseKeyMessage = properties.get('api.response.key.message');
let apiResponseKeyCode = properties.get('api.response.key.code');
let apiResponseKeySuccess = properties.get('api.response.key.success');
let apiResponseErrorMessage = properties.get('api.response.error.message');
let apiResponseErrorStatus = properties.get('api.response.error.status');
let appName = properties.get('app.name');

var app = express();
let redisClient = null;
let esClient = null;

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

function authenticate(req, res, next) {

    let token = req.headers['x-access-token'];

    jwt.verify(token, jwtKey, function (err, decoded) {

        if (!err) {

            redisClient.get(token, function (error, result) {

                if (result == null) {
                    redisClient.set(token, decoded["secret"]);
                    redisClient.expire(token, jwtTokenExpiry);
                }

                next();

            });


        } else {

            redisClient.del(token);

            return res.json({
                apiResponseKeySuccess: false,
                apiResponseKeyCode: apiResponseCodeInvalid,
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

function indexDocumentinES(esClient, index, document, res, response) {

    pg = new ProductGroup(document);

    esClient.index({

        index: (index + '.index').toLowerCase(),

        id: pg["groupID"],

        body: pg

    }, {}, (err, result) => {

        if (err) {
            apiResponseError(res);
            throw err;
        }

        res.json(response);
        res.end();

    });

}

function deleteDocumentinES(esClient, index, pgid, res, response) {

    esClient.delete({

        index: (index + '.index').toLowerCase(),

        id: pgid,

    }, {}, (err, result) => {

        if (err) {
            apiResponseError(res);
            throw err;
        }

        res.json(response);
        res.end();

    });

}

function createProductGroup(sdbClient, scollection, product, esClient, res, response) {


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
    subProduct.color = product["color"];
    subProduct.brand = product["brand"];
    subProduct.size = product["size"];
    subProduct.isMain = product["isMain"];

    productMap.set(product["sku"], subProduct);

    let pg = new ProductGroup({

        groupID: product["groupID"],
        name: product["name"],
        description: product["description"],
        regularPriceMin: product["regularPrice"],
        regularPriceMax: product["regularPrice"],
        promotionPriceMin: product["promotionPrice"],
        promotionPriceMax: product["promotionPrice"],
        active: product["active"],
        productSKUs: [product["sku"]],
        colors: [product["color"]],
        brands: [product["brand"]],
        sizes: [product["size"]],
        searchKeywords: product["searchKeywords"],
        category: product["category"],
        images: product["images"],
        products: productMap,

    });


    sdbClient.db(externalDB).collection(scollection).insertOne(pg, function (err, result) {

        if (err) {
            apiResponseError(res);
            throw err;
        }

        indexDocumentinES(esClient, scollection, pg, res, response);

    });

}


function updateProductGroup(sdbClient, scollection, pgid, uProduct, esClient, res, response) {

    var query = { "groupID": pgid };

    sdbClient.db(externalDB).collection(scollection).find(query).toArray(function (err, result) {

        if (err) {
            apiResponseError(res);
            throw err;
        }

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
            subProduct.color = uProduct["color"];
            subProduct.brand = uProduct["brand"];
            subProduct.size = uProduct["size"];
            subProduct.searchKeywords = uProduct["searchKeywords"];
            subProduct.isMain = uProduct["isMain"];

            pg["products"].set(uProduct["sku"], subProduct);

            let nrpmin = Number.MAX_VALUE;;
            let nrpmax = 0;
            let nppmin = Number.MAX_VALUE;;
            let nppmax = 0;
            let nActive = false;
            let nProductSKUs = [];
            let ncolors = [];
            let nbrands = [];
            let nsizes = [];
            let nSearchKeywords = [];
            let ncategory = [];

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

                if (uProduct["isMain"] == true) {
                    if (product["sku"] == uProduct["sku"]) {
                        product["isMain"] = true;
                    } else {
                        product["isMain"] = false;
                    }
                }

                nActive = nActive || product["active"];
                nProductSKUs.push(String(product["sku"]));
                ncolors.push(String(product["color"]));
                nbrands.push(String(product["brand"]));
                nsizes.push(String(product["size"]));
                nSearchKeywords.push(...product["searchKeywords"]);
                ncategory.push(...product["category"]);

            }


            pg["regularPriceMin"] = nrpmin;
            pg["regularPriceMax"] = nrpmax;
            pg["promotionPriceMin"] = nppmin;
            pg["promotionPriceMax"] = nppmax;
            pg["active"] = nActive;
            pg["name"] = productName;
            pg["description"] = productDescription;
            pg["productSKUs"] = [...new Set(nProductSKUs)];
            pg["colors"] = [...new Set(ncolors)];
            pg["brands"] = [...new Set(nbrands)];
            pg["sizes"] = [...new Set(nsizes)];
            pg["searchKeywords"] = [...new Set(nSearchKeywords)];
            pg["category"] = [...new Set(ncategory)];

            let uQuery = null;

            if (uProduct["isMain"] == true) {

                pg["images"] = uProduct["images"];

                uQuery = {
                    $set: {

                        "products": pg["products"],
                        "name": pg["name"],
                        "description": pg["description"],
                        "productSKUs": pg["productSKUs"],
                        "active": pg["active"],
                        "regularPriceMin": pg["regularPriceMin"],
                        "regularPriceMax": pg["regularPriceMax"],
                        "promotionPriceMin": pg["promotionPriceMin"],
                        "promotionPriceMax": pg["promotionPriceMax"],
                        "colors": pg["colors"],
                        "brands": pg["brands"],
                        "sizes": pg["sizes"],
                        "searchKeywords": pg["searchKeywords"],
                        "category": pg["category"],
                        "images": pg["images"]

                    }
                };

            } else {

                uQuery = {
                    $set: {
                        "products": pg["products"],
                        "name": pg["name"],
                        "description": pg["description"],
                        "productSKUs": pg["productSKUs"],
                        "active": pg["active"],
                        "regularPriceMin": pg["regularPriceMin"],
                        "regularPriceMax": pg["regularPriceMax"],
                        "promotionPriceMin": pg["promotionPriceMin"],
                        "promotionPriceMax": pg["promotionPriceMax"],
                        "colors": pg["colors"],
                        "brands": pg["brands"],
                        "sizes": pg["sizes"],
                        "searchKeywords": pg["searchKeywords"],
                        "category": pg["category"]
                    }
                };

            }

            sdbClient.db(externalDB).collection(scollection).updateOne(query, uQuery, function (err, result) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                indexDocumentinES(esClient, scollection, pg, res, response);

            });

        } else {
            return null;
        }

    });

}

function deleteProductInProductGroup(esClient, dbClient, pgcollection, pgid, sku, res, response) {

    var query = { "groupID": pgid };

    dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {

        if (err) {
            apiResponseError(res);
            throw err;
        }

        let products = result[0]["products"];
        let isDeletedProductMain = result[0]["products"][sku]["isMain"];
        delete products[sku];
        let postDeletedProductsLength = products.length;

        if (Object.keys(products).length == 0) {

            dbClient.db(externalDB).collection(pgcollection).deleteOne(query, function (err, result) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                response[apiResponseKeySuccess] = true;
                response[apiResponseKeyCode] = apiResponseCodeOk;
                response[apiResponseKeyMessage] = "Since the product group had only one product (remaining), the entire product group is now deleted ...";

                deleteDocumentinES(esClient, pgcollection, pgid, res, response);


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
        let ncolors = [];
        let nbrands = [];
        let nsizes = [];
        let nSearchKeywords = [];
        let ncategory = [];
        let updated = false;

        let i = 0;
        for (let product of pg["products"].values()) {

            i++;

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

            if (isDeletedProductMain) {
                if (product["isMain"] == true) {
                    pg["images"] = product["images"];
                    updated = true;
                } else if (!updated && postDeletedProductsLength == i) {
                    pg["images"] = product["images"];
                    updated = true;
                }
            }

            nActive = nActive || product["active"];
            nProductSKUs.push(String(product["sku"]));
            ncolors.push(String(product["color"]));
            nbrands.push(String(product["brand"]));
            nsizes.push(String(product["size"]));
            nSearchKeywords.push(...product["searchKeywords"]);
            ncategory.push(...product["category"]);

        }

        pg["regularPriceMin"] = nrpmin;
        pg["regularPriceMax"] = nrpmax;
        pg["promotionPriceMin"] = nppmin;
        pg["promotionPriceMax"] = nppmax;
        pg["active"] = nActive;
        pg["productSKUs"] = [...new Set(nProductSKUs)];
        pg["colors"] = [...new Set(ncolors)];
        pg["brands"] = [...new Set(nbrands)];
        pg["sizes"] = [...new Set(nsizes)];
        pg["searchKeywords"] = [...new Set(nSearchKeywords)];
        pg["category"] = [...new Set(ncategory)];

        let setQuery = {
            $set: {
                "products": products,
                "productSKUs": pg["productSKUs"],
                "active": pg["active"],
                "regularPriceMin": pg["regularPriceMin"],
                "regularPriceMax": pg["regularPriceMax"],
                "promotionPriceMin": pg["promotionPriceMin"],
                "promotionPriceMax": pg["promotionPriceMax"],
                "colors": pg["colors"],
                "brands": pg["brands"],
                "sizes": pg["sizes"],
                "searchKeywords": pg["searchKeywords"],
                "category": pg["category"]

            }
        };

        dbClient.db(externalDB).collection(pgcollection).updateOne(query, setQuery, function (err, result) {

            if (err) {
                apiResponseError(res);
                throw err;
            }

            indexDocumentinES(esClient, pgcollection, pg, res, response);


        });


    });


}

function apiResponseError(res) {

    response = new Object();
    response[apiResponseKeySuccess] = false;
    response[apiResponseKeyMessage] = apiResponseErrorMessage;
    response[apiResponseKeyCode] = apiResponseCodeError;

    res.status(apiResponseErrorStatus);
    res.send(response);
    res.end();

}

var main = function (rc, esc) {

    redisClient = rc;
    esClient = esc;

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

    app.get('/admin/' + apiVersion + '/customers/login/', function (req, res) {

        let id = req.query.id;
        let apiKey = req.query.apiKey;

        var query = { "id": id, "apiKey": apiKey };

        dbClient.db(internalDB).collection(customerCollection).find(query).toArray(function (err, result) {

            if (err) {
                apiResponseError(res);
                throw err;
            }

            res.setHeader('Content-Type', 'application/json');
            response = new Object();

            if (result.length == 1) {

                var token = jwt.sign({ secret: result[0]["name"] + "." + result[0]["secret"] }, jwtKey, { expiresIn: jwtTokenExpiry });

                redisClient.set(token, result[0]["name"] + "." + result[0]["secret"]);
                redisClient.expire(token, jwtTokenExpiry);

                response["token"] = token;
                response["validFor"] = jwtTokenExpiry;
                response[apiResponseKeySuccess] = true;
                response[apiResponseKeyCode] = apiResponseCodeOk;
                response[apiResponseKeyMessage] = "Access with valid credentials ...";

            } else {
                response[apiResponseKeySuccess] = false;
                response[apiResponseKeyCode] = apiResponseCodeInvalid;
                response[apiResponseKeyMessage] = "Invalid credentials ...";

            }

            res.json(response);
            res.end();

        });


    });


    app.get('/catalog/' + apiVersion + '/productgroups/:ID',

        [
            check('ID').exists().withMessage("ID should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let id = req.params.ID;

            res.setHeader('Content-Type', 'application/json');

            redisClient.get(req.url, function (err, cache_result) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                if (cache_result == null || cache_result.length == 0) {

                    redisClient.get(req.headers['x-access-token'], function (error, customer_domain) {

                        var query = { $or: [{ productSKUs: { $elemMatch: { $eq: id } } }, { groupID: id }] };
                        let pgcollection = customer_domain + "." + productGroupsCollection;

                        dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            if (result.length == 1) {
                                redisClient.set(req.url, JSON.stringify(result[0]));
                                res.json(result[0]);
                            } else {
                                response = new Object();
                                response[apiResponseKeySuccess] = false;
                                response[apiResponseKeyCode] = apiResponseCodeInvalid;
                                response[apiResponseKeyMessage] = "Product Group with ID " + id + " not found ...";
                                res.json(response);
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


    app.get('/catalog/' + apiVersion + '/products/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            let sku = req.params.SKU;

            res.setHeader('Content-Type', 'application/json');

            redisClient.get(req.url, function (err, cache_result) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                if (cache_result == null || cache_result.length == 0) {

                    redisClient.get(req.headers['x-access-token'], function (error, customer_domain) {

                        var query = { "sku": sku };
                        let pcollection = customer_domain + "." + productsCollection;

                        dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            if (result.length == 1) {
                                redisClient.set(req.url, JSON.stringify(result[0]));
                                res.json(result[0]);
                            } else {
                                response = new Object();
                                response[apiResponseKeySuccess] = false;
                                response[apiResponseKeyCode] = apiResponseCodeInvalid;
                                response[apiResponseKeyMessage] = "Product with SKU " + sku + " not found ...";
                                res.json(response);
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


    app.post('/catalog/' + apiVersion + '/products',

        [
            check('sku').exists().withMessage("SKU should be present ..."),
            check('sku').isAlphanumeric().withMessage("SKU can only be made of alphanumeric characters (A-Z,a-z,0-9)..."),
            check('sku').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),
            check('sku').isLength({ max: 50 }).withMessage("SKU Value cannot be more than 50 characters ..."),

            check('name').exists().withMessage("Product Name should be present ..."),
            check('name').isLength({ min: 3 }).withMessage("Product Name Value needs to be more than 3 characters ..."),
            check('name').isLength({ max: 250 }).withMessage("Product Name Value cannot be more than 250 characters ..."),

            check('groupID').exists().withMessage("Product Group ID should be present ..."),
            check('groupID').isAlphanumeric().withMessage("Product Group ID can only be made of alphanumeric characters (A-Z,a-z,0-9)..."),
            check('groupID').isLength({ min: 3 }).withMessage("Product Group ID Value needs to be more than 3 characters ..."),
            check('groupID').isLength({ max: 50 }).withMessage("Product Group ID Value cannot be more than 50 characters ..."),

            check('description').exists().withMessage("Product Desription should be present ..."),
            check('description').isLength({ min: 3 }).withMessage("Product Desription Value needs to be more than 3 characters ..."),
            check('description').isLength({ max: 2048 }).withMessage("Product Desription Value cannot be more than 2048 characters ..."),

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

            }),

            check('images').exists().withMessage("Valid image URLs are mandatory for good user experience ..."),
            check('images').isURL().withMessage("Valid image URLs are mandatory for good user experience ..."),
            check('searchKeywords').exists().withMessage("searchKeywords field should be populated with relevant keywords for good quality search ..."),
            check('category').exists().withMessage("Category mapping is essential for good recommendation ..."),
            check('active').exists().withMessage("active flag is a mandatory field ..."),
            check('active').isBoolean().withMessage("active flag should only have either true or false as a value ..."),
            check('isMain').exists().withMessage("isMain flag is a mandatory field ..."),
            check('isMain').isBoolean().withMessage("isMain flag should only have either true or false as a value ...")
        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);

            redisClient.get(req.headers['x-access-token'], function (error, customer_domain) {

                var query = { "sku": req.body.sku };
                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;

                dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {

                    if (err) {
                        apiResponseError(res);
                        throw err;
                    }

                    res.setHeader('Content-Type', 'application/json');
                    response = new Object();

                    if (result.length == 0) {

                        dbClient.db(externalDB).collection(pcollection).insertOne(product, function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            let Gquery = { "groupID": product["groupID"] };

                            dbClient.db(externalDB).collection(pgcollection).find(Gquery).toArray(function (err, result) {

                                if (err) {
                                    apiResponseError(res);
                                    throw err;
                                }


                                response[apiResponseKeySuccess] = true;
                                response[apiResponseKeyCode] = apiResponseCodeOk;
                                response["response"] = product;
                                redisClient.del('/catalog/' + apiVersion + '/productgroups/' + product["groupID"]);


                                if (result.length != 1) {
                                    createProductGroup(dbClient, pgcollection, product, esClient, res, response);
                                } else {
                                    updateProductGroup(dbClient, pgcollection, product["groupID"], product, esClient, res, response);
                                }

                            });


                        });



                    } else {

                        response[apiResponseKeySuccess] = false;
                        response[apiResponseKeyCode] = apiResponseCodeInvalid;
                        response[apiResponseKeyMessage] = "Product with the mentioned SKU already exists, if you want to update any field(s) please use the PUT method ...";
                        res.json(response);
                        res.end();

                    }


                });

            });

        });


    app.put('/catalog/' + apiVersion + '/products',

        [
            check('sku').exists().withMessage("SKU should be present ..."),
            check('sku').isAlphanumeric().withMessage("SKU can only be made of alphanumeric characters (A-Z,a-z,0-9)..."),
            check('sku').isLength({ min: 3 }).withMessage("SKU Value needs to be more than 3 characters ..."),
            check('sku').isLength({ max: 50 }).withMessage("SKU Value cannot be more than 50 characters ..."),

            check('name').exists().withMessage("Product Name should be present ..."),
            check('name').isLength({ min: 3 }).withMessage("Product Name Value needs to be more than 3 characters ..."),
            check('name').isLength({ max: 250 }).withMessage("Product Name Value cannot be more than 250 characters ..."),

            check('groupID').exists().withMessage("Product Group ID should be present ..."),
            check('groupID').isAlphanumeric().withMessage("Product Group ID can only be made of alphanumeric characters (A-Z,a-z,0-9)..."),
            check('groupID').isLength({ min: 3 }).withMessage("Product Group ID Value needs to be more than 3 characters ..."),
            check('groupID').isLength({ max: 50 }).withMessage("Product Group ID Value cannot be more than 50 characters ..."),

            check('description').exists().withMessage("Product Desription should be present ..."),
            check('description').isLength({ min: 3 }).withMessage("Product Desription Value needs to be more than 3 characters ..."),
            check('description').isLength({ max: 2048 }).withMessage("Product Desription Value cannot be more than 2048 characters ..."),

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

            }),

            check('images').exists().withMessage("Valid image URLs are mandatory for good user experience ..."),
            check('images').isURL().withMessage("Valid image URLs are mandatory for good user experience ..."),
            check('searchKeywords').exists().withMessage("searchKeywords field should be populated with relevant keywords for good quality search ..."),
            check('category').exists().withMessage("Category mapping is essential for good recommendation ..."),
            check('active').exists().withMessage("active flag is a mandatory field ..."),
            check('active').isBoolean().withMessage("active flag should only have either true or false as a value ..."),
            check('isMain').exists().withMessage("isMain flag is a mandatory field ..."),
            check('isMain').isBoolean().withMessage("isMain flag should only have either true or false as a value ...")

        ],

        authenticate,

        validateInput,

        (req, res) => {

            const product = new Product(req.body);

            redisClient.get(req.headers['x-access-token'], function (err, customer_domain) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                var query = { "sku": req.body.sku };
                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;

                dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {

                    if (err) {
                        apiResponseError(res);
                        throw err;
                    }

                    res.setHeader('Content-Type', 'application/json');
                    response = new Object();

                    if (result.length == 0) {

                        dbClient.db(externalDB).collection(pcollection).insertOne(product, function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            let gQuery = { "groupID": product["groupID"] };

                            dbClient.db(externalDB).collection(pgcollection).find(gQuery).toArray(function (err, result) {

                                if (err) {
                                    apiResponseError(res);
                                    throw err;
                                }

                                response[apiResponseKeySuccess] = true;
                                response[apiResponseKeyCode] = apiResponseCodeOk;
                                response["response"] = product;

                                if (result.length != 1) {
                                    createProductGroup(dbClient, pgcollection, product, esClient, res, response);
                                } else {
                                    updateProductGroup(dbClient, pgcollection, product["groupID"], product, esClient, res, response);
                                }

                            });



                        });

                    } else {

                        product["_id"] = result[0]["_id"];

                        dbClient.db(externalDB).collection(pcollection).updateOne(query, product, function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            redisClient.del(req.url + req.body.sku);
                            redisClient.set(req.url + req.body.sku, JSON.stringify(product));
                            redisClient.del('/catalog/' + apiVersion + '/productgroups/' + product["groupID"]);

                            let gQuery = { "groupID": product["groupID"] };

                            dbClient.db(externalDB).collection(pgcollection).find(gQuery).toArray(function (err, result) {

                                if (err) {
                                    apiResponseError(res);
                                    throw err;
                                }

                                response[apiResponseKeySuccess] = true;
                                response[apiResponseKeyCode] = apiResponseCodeOk;
                                response[apiResponseKeyMessage] = "Product Updated";
                                response["response"] = product;

                                if (result.length == 1) {
                                    updateProductGroup(dbClient, pgcollection, product["groupID"], product, esClient, res, response);
                                } else {
                                    res.end();
                                }

                            });



                        });



                    }


                });

            });

        });


    app.delete('/catalog/' + apiVersion + '/products/:SKU',

        [
            check('SKU').exists().withMessage("SKU should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            redisClient.get(req.headers['x-access-token'], function (err, customer_domain) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;


                let sku = req.params.SKU;
                res.setHeader('Content-Type', 'application/json');
                var query = { "sku": sku };
                response = new Object();

                dbClient.db(externalDB).collection(pcollection).find(query).toArray(function (err, result) {

                    if (err) {
                        apiResponseError(res);
                        throw err;
                    }

                    if (result == null || result.length == 0) {

                        response[apiResponseKeySuccess] = false;
                        response[apiResponseKeyCode] = apiResponseCodeInvalid;
                        response[apiResponseKeyMessage] = "Product with SKU " + sku + " does not exist ...";
                        res.json(response);
                        res.end();
                        return;

                    }

                    let pgid = result[0]["groupID"];

                    dbClient.db(externalDB).collection(pcollection).deleteOne(query, function (err, result) {

                        if (err) {
                            apiResponseError(res);
                            throw err;
                        }

                        redisClient.del(req.url);
                        redisClient.del('/catalog/' + apiVersion + '/productgroups/' + pgid);

                        response[apiResponseKeySuccess] = true;
                        response[apiResponseKeyCode] = apiResponseCodeOk;
                        response[apiResponseKeyMessage] = "Product with SKU " + sku + " deleted and the product group is updated ...";

                        deleteProductInProductGroup(esClient, dbClient, pgcollection, pgid, sku, res, response);
                        return;

                    });

                });

            });

        });

    app.delete('/catalog/' + apiVersion + '/productgroups/:PGID',

        [
            check('PGID').exists().withMessage("PGID should be present ..."),
        ],

        authenticate,

        validateInput,

        (req, res) => {

            redisClient.get(req.headers['x-access-token'], function (err, customer_domain) {

                if (err) {
                    apiResponseError(res);
                    throw err;
                }

                let pgid = req.params.PGID;
                res.setHeader('Content-Type', 'application/json');
                var query = { "groupID": pgid };
                response = new Object();
                let pg = new ProductGroup();

                let pcollection = customer_domain + "." + productsCollection;
                let pgcollection = customer_domain + "." + productGroupsCollection;


                dbClient.db(externalDB).collection(pgcollection).find(query).toArray(function (err, result) {

                    if (err) {
                        apiResponseError(res);
                        throw err;
                    }

                    if (result == null || result.length == 0) {

                        response[apiResponseKeySuccess] = false;
                        response[apiResponseKeyCode] = apiResponseCodeInvalid;
                        response[apiResponseKeyMessage] = "Product Group with ID " + pgid + " does not exist ...";
                        res.json(response);
                        res.end();
                        return;

                    } else {
                        pg = new ProductGroup(result[0]);
                    }

                    let pskus = result[0]["productSKUs"];

                    var pdelQuery = { 'sku': { '$in': pskus } };

                    dbClient.db(externalDB).collection(pcollection).deleteMany(pdelQuery, function (err, result) {


                        if (err) {
                            apiResponseError(res);
                            throw err;
                        }

                        dbClient.db(externalDB).collection(pgcollection).deleteOne(query, function (err, result) {

                            if (err) {
                                apiResponseError(res);
                                throw err;
                            }

                            redisClient.del(req.url);

                            function removeCacheKeysForSubProducts(sku, index) {
                                redisClient.del('/catalog/' + apiVersion + '/products/' + sku);
                            }

                            pskus.forEach(removeCacheKeysForSubProducts);

                            response = new Object();
                            response[apiResponseKeySuccess] = true;
                            response[apiResponseKeyCode] = apiResponseCodeOk;
                            response[apiResponseKeyMessage] = "Product group is now deleted ...";

                            deleteDocumentinES(esClient, pgcollection, pgid, res, response);


                        });


                    });


                });


            });

        });

    app.listen(apiPort, () => { console.log(appName + ` is now listening port ${apiPort} ...`); });

};


module.exports.main = main;