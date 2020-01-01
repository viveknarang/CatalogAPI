---
title: API Reference

language_tabs: # must be one of https://git.io/vQNgJ
##  - javascript  

toc_footers:
  - <span>API documentation version 1.1</span>
  - <a href='mailto:vivek.narang10@gmail.com'>Contact Us</a>

includes:
##  - errors

search: true
---

# Introduction

This API provides you with several options to maintain your product catalog and search products in your catalog. 

With this API, you can create, update and delete products in your product catalog. The API automatically manages the product groups for you. The product group is identified by the groupID field (i.e. all the products with the same groupID are combined in a single product group). While the API allows you to get and delete product groups by groupID, the API does not allow you to directly modify the product groups. The only way to modify product groups is to use API endpoints for individual products. With this approach, the API tries to ensure that the data is not corrupted. When you delete a product group, all the products in the group are also automatically deleted. 

<aside class="notice">
It is important to understand the concept of product groups. For search quality and other advanced features provided by our platform, products are grouped to form product groups. These product groups are essentially a product with different variations. Example: A shirt can be of multiple sizes and/or colors. So all of the variations of this shirt are grouped to form a product group.  
</aside>

The search API is fairly powerful too. It allows features like search on a specific field or a set of fields. The search API responds with product groups where the query matches certain fields. Search API also allows you to select the standard facets to be included in the API response. In addtion to the features mentioned above, the API automatically syncs the search index with changes in products/product groups, **in real-time**. Also, for efficiency and speed, the search and GET product/productgroup endpoints are cached. Upon any updates, the cache is updated as well. 

We are continuously adding new features and improving this API, if you have any suggestions please reach out to us [here](mailto:vivek.narang10@gmail.com)

API Powered by

- Node.js            
- Redis             
- Elasticsearch     
- MongoDB           


Team

- Vivek Narang
- Siddhartha Gupta


<aside class="success">
The current API version is: v1 Please replace {API version} with v1 in your API calls
</aside>

# API login

## Get API access token

> Sample valid API response:


```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZWNyZXQiOiJDb250ZUFtZXJpY2EuZmZhYWJiY2NkZCIsImlhdCI6MTU3NzU5NzA3NCwiZXhwIjoxNTc3NjgzNDc0fQ.OWmntF6eSpAxUqFovVO0I01p1QqEn_McQDNVm7ISoIk",
    "validFor": 86400,
    "success": true,
    "code": "OK",
    "message": "Access with valid credentials! Please include the token in the header of your subsequent API calls ..."
}
```

> Sample invalid API response (valid token expired or invalid token used):

```json
{
    "apiResponseKeySuccess": false,
    "apiResponseKeyCode": "INVALID",
    "message": "The token is not valid (anymore)! If you think that your token is expired please use the login endpoint to get a new token for your API calls ..."
}
```

> Sample invalid API response:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "Invalid credentials or login attempt with valid credentials by an inactive customer!"
}
```

This endpoint gets you your API access token. You need to send your customer ID and the API key that we provided you for using our platform. Upon receiving your valid credentials, the API will respond with a token with additional information including the validFor key which tells you how long this access token is valid for. Please set **x-access-token** to the value of the **token**, in the header of your subsequent API calls. 


### HTTP Request

`GET http://api.gallao.io/admin/{API version}/customers/login`

### URL Parameters

Parameter | Description
--------- | -----------
id        | Your customer ID provided by us
apiKey    | The API key that is sent by us

<aside class="warning">
You do not need to invoke login too often. Please include the token that you receive upon a successful login in your subsequent API calls, until the token expires.
</aside>

### Response

   Key    |    Description
--------- | -----------------
token     | The token that you will be including in your subsequent API calls
validFor  | The validity of the token (in seconds)
success   | Was the API call successful?
code      | Additional code
message   | Short message providing more information. 

<aside class="notice">
With the field validFor in response, you can calculate the time after with your servers need to login again to get a new token.
</aside>


# Catalog API

## Add a new product

> Sample valid API response:


```json
{
    "success": true,
    "code": "OK",
    "reponse": {
        "images": [
            "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
        ],
        "searchKeywords": [
            "Biscuit"
        ],
        "category": [
            "Food>Snacks>Biscuit"
        ],
        "isMain": true,
        "sku": "9398111",
        "name": "Parle-G",
        "description": "biscuits",
        "groupID": "B39408",
        "regularPrice": 5.99,
        "promotionPrice": 2.99,
        "quantity": 38780,
        "color": "Brown",
        "brand": "Parle",
        "size": "Normal",
        "active": true
    }
}
```

Use this API endpoint to add a new product in the products collection. When a product is added in the products collection, this product is also added in product group collection. If the product group with the matching groupID is missing, a new product group is formed. Search index and the cache are also automatically updated with a valid call to this endpoint. 


### HTTP Request

`POST http://api.gallao.io/catalog/{API version}/products`

### Header

Parameter          |                Description
------------------ | ---------------------------------------------
x-access-token     | The access token that you receive upon login
Content-Type       | application/x-www-form-urlencoded

### Body Parameters

    Parameter   |          Constraints         |        Description
----------------| -----------------------------|------------------------------
sku             |   String, Max 50 Characters  |  The SKU of the product
name            |   Text, Max 250 Characters   |  The name of the product
description     |   Text, Max 2048 Characters  |  The description of the product
groupID         |   String, Max 50 Characters  |  The product group ID
regularPrice    |   Float, Greater than 0      |  Everyday price
promotionPrice  |   Float, Greater than 0      |  On-sale price
images          |   URL, Mandatory             |  Product images
searchKeywords  |   Text, Mandatory            |  Keywords that you want this product to be searched with
quantity        |   Integer, Greater than 0    |  Inventory stock quantity
category        |   Text, Mandatory            |  Category breadcrumbs
color           |   Text, Optional             |  Product color
brand           |   Text, Optional             |  Product brand
size            |   Text, Optional             |  Product size
active          |   Boolean, Mandatory         |  Is product available for sale?
isMain          |   Boolean, Mandatory         |  Is the product main product in the group?


### Response

        Key        |          Description
------------------ | -----------------------------
success            |  The flag that tells if the API request was successful
code               |  Additional response code
response           |  Product object sent in response





## Get a specific product

> Sample valid API response:


```json
{
    "_id": "5e07f2b5544f16401a1952e4",
    "images": [
        "https://homepages.cae.wisc.edu/~ece533/images/boat.png"
    ],
    "searchKeywords": [
        "Biscuit"
    ],
    "category": [
        "Food>Snacks>Biscuit"
    ],
    "isMain": true,
    "sku": "9398474",
    "name": "Krackjack",
    "description": "biscuits",
    "groupID": "B39408",
    "regularPrice": 7.99,
    "promotionPrice": 5.99,
    "quantity": 4435,
    "color": "Brown",
    "brand": "HIL",
    "size": "Square",
    "active": true
}
```

> Sample invalid API reponse:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "Product with SKU 93984746 not found ..."
}
```

When you want to get a specific product you can use this endpoint. All you need to pass is your access token and the SKU. This endpoint is cached for efficiency but also ensures that updated product data is served when applicable. 


### HTTP Request

`GET http://api.gallao.io/catalog/{API version}/products/{SKU}`

### Header

Parameter          |                 Description
------------------ | --------------------------------------------
x-access-token     | The access token that you receive upon login

### URL Parameters

Parameter | Description
--------- | -----------
SKU       | The product SKU

### Response

    Key         |          Description
----------------| ------------------------------
_id             |   Internal field, database object identifier
sku             |   The SKU of the product
name            |   The name of the product
description     |   The description of the product
groupID         |   The product group ID
regularPrice    |   Everyday price
promotionPrice  |   On-sale price
images          |   Product images 
searchKeywords  |   Keywords that you want this product to be searched with
quantity        |   Inventory stock quantity
category        |   Category breadcrumbs
color           |   Product color
brand           |   Product brand
size            |   Product size
active          |   Is product available for sale?
isMain          |   Is the product main product in the group?




## Update a product

> Sample valid API response:


```json
{
    "success": true,
    "code": "OK",
    "message": "Product Updated",
    "reponse": {
        "images": [
            "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
        ],
        "searchKeywords": [
            "Biscuit"
        ],
        "category": [
            "Food>Snacks>Biscuit"
        ],
        "isMain": true,
        "sku": "9398111",
        "name": "Parle-G",
        "description": "biscuits",
        "groupID": "B39408",
        "regularPrice": 7.99,
        "promotionPrice": 2.99,
        "quantity": 38780,
        "color": "Brown",
        "brand": "Parle",
        "size": "Normal",
        "active": true
    }
}
```

Use this API endpoint to update your product information in the catalog. For now you need to pass the entire product object with updated parts (this functionality will be improved very soon). When you hit this endpoint, the data in the products collection gets updated, product group data also gets updated automatically, search index is also updated and the cache entry is removed first and updated on the next GET call. 


### HTTP Request

`PUT http://api.gallao.io/catalog/{API version}/products`

### Header

Parameter      |                 Description
-------------- | ----------------------------------------------
x-access-token | The access token that you receive upon login
Content-Type   | application/x-www-form-urlencoded


### Body Parameters

    Parameter   |          Constraints         |        Description
----------------| -----------------------------|------------------------------
sku             |   String, Max 50 Characters  |  The SKU of the product
name            |   Text, Max 250 Characters   |  The name of the product
description     |   Text, Max 2048 Characters  |  The description of the product
groupID         |   String, Max 50 Characters  |  The product group ID
regularPrice    |   Float, Greater than 0      |  Everyday price
promotionPrice  |   Float, Greater than 0      |  On-sale price
images          |   URL, Mandatory             |  Product images
searchKeywords  |   Text, Mandatory            |  Keywords that you want this product to be searched with
quantity        |   Integer, Greater than 0    |  Inventory stock quantity
category        |   Text, Mandatory            |  Category breadcrumbs
color           |   Text, Optional             |  Product color
brand           |   Text, Optional             |  Product brand
size            |   Text, Optional             |  Product size
active          |   Boolean, Mandatory         |  Is product available for sale?
isMain          |   Boolean, Mandatory         |  Is the product main product in the group?


### Response

        Key        |          Description
------------------ | -----------------------------
success            |  The flag that tells if the API request was successful
code               |  Additional response code
response           |  Product object with updated data is sent in response
message            |  Additional message for more information on the API response




## Delete a product

> Sample valid API response:


```json
{
    "success": true,
    "code": "OK",
    "message": "Product with SKU 9398473 deleted and the product group is updated ..."
}
```


> If the SKU does not exist, the response will look like the following:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "Product with SKU 9398473 does not exist ..."
}
```

Use this API endpoint to remove a product from the catalog. When you hit this endpoint with a valid request, the product in the products collection gets removed, the productgroups collection is also automatically updated and the cache and search index is also updated. If there was only one product in the product group the product group object is also removed from the productgroups collection. 
 

### HTTP Request

`DELETE http://api.gallao.io/catalog/{API version}/products/{SKU}`

### Header

Parameter      |                 Description
-------------- | --------------------------------------------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter |             Description
--------- | ------------------------------------
SKU       | the SKU of the product to be deleted



## Get a product group

> Sample valid API response:


```json
{
    "_id": "5e07f10b544f16401a195281",
    "productSKUs": [
        "9398111",
        "9398474"
    ],
    "colors": [
        "Brown"
    ],
    "brands": [
        "Parle",
        "HIL"
    ],
    "sizes": [
        "Normal",
        "Square"
    ],
    "images": [
        "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
    ],
    "searchKeywords": [
        "Biscuit"
    ],
    "category": [
        "Food>Snacks>Biscuit"
    ],
    "groupID": "B39408",
    "name": "Parle-G",
    "description": "biscuits",
    "regularPriceMin": 7.99,
    "regularPriceMax": 7.99,
    "promotionPriceMin": 2.99,
    "promotionPriceMax": 5.99,
    "active": true,
    "products": {
        "9398111": {
            "sku": "9398111",
            "regularPrice": 7.99,
            "promotionPrice": 2.99,
            "images": [
                "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
            ],
            "searchKeywords": [
                "Biscuit"
            ],
            "quantity": 38780,
            "active": true,
            "category": [
                "Food>Snacks>Biscuit"
            ],
            "attributes": null,
            "color": "Brown",
            "brand": "Parle",
            "size": "Normal",
            "isMain": true
        },
        "9398474": {
            "sku": "9398474",
            "regularPrice": 7.99,
            "promotionPrice": 5.99,
            "images": [
                "https://homepages.cae.wisc.edu/~ece533/images/boat.png"
            ],
            "searchKeywords": [
                "Biscuit"
            ],
            "quantity": 4435,
            "active": true,
            "category": [
                "Food>Snacks>Biscuit"
            ],
            "attributes": null,
            "color": "Brown",
            "brand": "HIL",
            "size": "Square",
            "isMain": false
        }
    }
}
```

> Sample valid API response:


```json
{
    "success": false,
    "code": "INVALID",
    "message": "Product Group with ID B3940866 not found ..."
}
```


This API endpoint gets a specific product group by product group ID. This endpoint is cached for efficiency and speed. 


### HTTP Request

`GET http://api.gallao.io/catalog/{API version}/productgroups/{PGID}`

### Header

Parameter      |                 Description
-------------- | --------------------------------------------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter |                  Description
--------- | ------------------------------------------------
PGID      | The ID of the product group that you wish to get

### Response

      Key             |             Description
--------------------- | ------------------------------------
productSKUs           |  A list of SKUs of all the products in the group
colors                |  A list of all the colors from all the products in the group
brands                |  A list of all the brands from all the products in the group
sizes                 |  A list of all the sizes from all the products in the group
images                |  A list of all the images from the main product in the group
searchKeywords        |  A list of all the searchKeywords from all the products in the group
category              |  Category from the main product in the group
groupID               |  Product group ID to uniquely identify this product group
name                  |  Name from the main product in the group 
description           |  Product description
regularPriceMin       |  Minimum regular price computed in the group
regularPriceMax       |  Maximum regular price computed in the group
promotionPriceMin     |  Minimum promotion price computed in the group
promotionPriceMax     |  Maximum promotion price computed in the group
active                |  Active flag to indicate if the product is available for sale
products              |  List of all the product objects for reference



## Delete a product group

> Sample valid API response:


```json
{
    "success": true,
    "code": "OK",
    "message": "Product group is now deleted ..."
}
```


> If the PGID does not exist, the response will look like the following:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "Product Group with ID 9398473 does not exist ..."
}
```

Use this API endpoint to remove a product group from the productgroups collection in the database. This call also updates the search index. When a product group is deleted, entries of related products in the products collection are also removed. 
 

### HTTP Request

`DELETE http://api.gallao.io/catalog/{API version}/productgroups/{PGID}`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter |                  Description
--------- | -----------------------------------------------
PGID      | the group ID of the product group to be deleted






# Order API

## Create an order

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "message": "Order ( Order ID: 124 ) for customer 456 is created ...",
    "response": {
        "status": "ORDERED",
        "shippingAddress": {
            "firstName": "Vivek",
            "lastName": "Narang",
            "addressLineOne": "119 A/4 BAI KA BAGH",
            "addressLineTwo": "Mishir Bagh",
            "city": "Allahabad",
            "state": "UP",
            "country": "India",
            "pincode": "211003",
            "email": "vivek.narang10@gmail.com",
            "phoneNumber": "6476154080"
        },
        "orderID": "124",
        "customerID": "456",
        "orderDate": "2001-12-31T05:00:00.000Z",
        "totalAmount": 101,
        "currency": "USD",
        "isGift": false,
        "productQuantity": {
            "389743987": "5555"
        },
        "productPrice": {
            "389743987": "55.8"
        },
        "shippingDetails": null
    }
}
```

Use this endpoint to create an order entry in the database. Details on the fields and the constraints is listed below. 


### HTTP Request

`POST http://api.gallao.io/order/{API version}/orders`

### Header

Parameter      |                 Description
-------------- | --------------------------------------------
x-access-token | The access token that you receive upon login
Content-Type   | application/x-www-form-urlencoded

### Body Parameters

Parameter                         |               Constraints                           |
--------------------------------- | --------------------------------------------------- |
shippingAddress.firstName         |  String, Less than equal to 50 characters           |
shippingAddress.lastName          |  String, Less than equal to 50 characters           |
shippingAddress.addressLineOne    |  String, Less than equal to 50 characters           |
shippingAddress.addressLineTwo    |  String, Less than equal to 50 characters (Optional)|
shippingAddress.city              |  String, Less than equal to 50 characters           |
shippingAddress.state             |  String, Less than equal to 50 characters           |
shippingAddress.country           |  String, Less than equal to 50 characters           |
shippingAddress.pincode           |  String, Less than equal to 50 characters           |
shippingAddress.email             |  Valid Email                                        |
shippingAddress.phoneNumber       |  String, Less than 12 characters                    |
orderID                           |  Alphanumeric, Less than equal to 50 characters     |
customerID                        |  Alphanumeric, Less than equal to 50 characters     |
orderDate                         |  Valid Date                                         |
totalAmount                       |  Float                                              |
currency                          |  Currently Acceptable 'USD', 'CAD', 'EUR', 'INR'    |
isGift                            |  Boolean - true OR false                            |
status                            |  Acceptable order state only ORDERED at creation    |
productQuantity                   |  Map { SKU => Quantity }, multiple entries allowed  | 
productPrice                      |  Map { SKU => Price }, multiple entries allowed     |



### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
message                   | Addtitional text message for more information               |
response                  | Order object returned in response                           |


## Get orders for a customer

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "response": [
        {
            "_id": "5e0c0b30df2cabd231d7735f",
            "status": "ORDERED",
            "shippingAddress": {
                "firstName": "Vivek",
                "lastName": "Narang",
                "addressLineOne": "119 A/4 BAI KA BAGH",
                "addressLineTwo": "Mishir Bagh",
                "city": "Allahabad",
                "state": "UP",
                "country": "India",
                "pincode": "211003",
                "email": "vivek.narang10@gmail.com",
                "phoneNumber": "6476154080"
            },
            "orderID": "124",
            "customerID": "456",
            "orderDate": "2001-12-31T05:00:00.000Z",
            "totalAmount": 101,
            "currency": "USD",
            "isGift": false,
            "productQuantity": {
                "389743987": "5555"
            },
            "productPrice": {
                "389743987": "55.8"
            },
            "shippingDetails": null
        }
    ]
}
```

Use this endpoint to get all the orders associated with a customer using the customer ID. 


### HTTP Request

`GET http://api.gallao.io/order/{API version}/orders/customers/{CID}`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter                 |               Description           |
------------------------- | ------------------------------------|
CID                       | Customer ID                         |

### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
response                  | Order object returned in response                           |




## Get order by order ID

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "response": [
        {
            "_id": "5e0c0b30df2cabd231d7735f",
            "status": "ORDERED",
            "shippingAddress": {
                "firstName": "Vivek",
                "lastName": "Narang",
                "addressLineOne": "119 A/4 BAI KA BAGH",
                "addressLineTwo": "Mishir Bagh",
                "city": "Allahabad",
                "state": "UP",
                "country": "India",
                "pincode": "211003",
                "email": "vivek.narang10@gmail.com",
                "phoneNumber": "6476154080"
            },
            "orderID": "124",
            "customerID": "456",
            "orderDate": "2001-12-31T05:00:00.000Z",
            "totalAmount": 101,
            "currency": "USD",
            "isGift": false,
            "productQuantity": {
                "389743987": "5555"
            },
            "productPrice": {
                "389743987": "55.8"
            },
            "shippingDetails": null
        }
    ]
}
```

Use this endpoint to get the order object using the order ID. 


### HTTP Request

`GET http://api.gallao.io/order/{API version}/orders/{ID}`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter                 |               Description           |
------------------------- | ------------------------------------|
ID                        |  Order ID                           | 

### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
response                  | Order object returned in response                           |




## Update order status

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "message": "Order with order id 124 updated ... "
}
```

> Sample invalid API response:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "Nothing to update for order ID 124"
}
```

> Sample invalid API response:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "No order found with order ID 1245"
}
```


Use this endpoint to update the status of the order. The status of the order can only be among the following values: **'ORDERED', 'UNDER_PROCESSING', 'SHIPPED', 'CANCELED'**


### HTTP Request

`PUT http://api.gallao.io/order/{API version}/orders/{ID}/updatestatus/{STATUS}`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter                 |               Description                             |
------------------------- | ------------------------------------------------------|
ID                        |  Order ID                                             |
STATUS                    |  'ORDERED', 'UNDER_PROCESSING', 'SHIPPED', 'CANCELED' |



### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
message                   | Additional information on the API call                      |




## Delete order by order ID

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "message": "Order with order ID 124 deleted ..."
}
```

> Sample invalid API response:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "No order found with order ID 124"
}
```

Use this endpoint to delete an order using the order ID. Recommended to use this endpoint carefully. 


### HTTP Request

`DELETE http://api.gallao.io/order/{API version}/orders/{ID}`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter                 |               Description           |
------------------------- | ------------------------------------|
ID                        |  Order ID                           |

### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
message                   | Additional information on the API call                      |




## Delete all orders for a customer

> Sample valid API response:

```json
{
    "success": true,
    "code": "OK",
    "message": "A total of 1 order(s) for customer ID 456 deleted ..."
}
```

> Sample valid API response:

```json
{
    "success": false,
    "code": "INVALID",
    "message": "No order(s) found for customer ID 456"
}
```


Use this endpoint to delete all orders associated with a customer using the customer ID. Recommended that this endpoint be used carefully as this data will be used by the order lifecycle management engine and also order information will be archived (planned feature).


### HTTP Request

`DELETE http://api.gallao.io/order/{API version}/orders/customer/{CID}`

### Header

Parameter      | Description                                  |
-------------- | ---------------------------------------------|
x-access-token | The access token that you receive upon login |

### URL Parameters

Parameter                 |               Description           |
------------------------- | ------------------------------------|
CID                       |  Customer ID  

### Response

      Key                 |             Description                                     |
------------------------- | ------------------------------------------------------------|
success                   | Flag to tell if the request was successful                  |
code                      | Additional code for more specific information               |
message                   | Additional information on the API call                      |



# Search API

## Basic search

> Sample valid API response:

```json
{
    "took": 7,
    "timed_out": false,
    "_shards": {
        "total": 1,
        "successful": 1,
        "skipped": 0,
        "failed": 0
    },
    "hits": {
        "total": {
            "value": 1,
            "relation": "eq"
        },
        "max_score": 0.18232156,
        "hits": [
            {
                "_index": "conteamerica.ffaabbccdd.productgroups.index",
                "_type": "_doc",
                "_id": "B39408",
                "_score": 0.18232156,
                "_source": {
                    "productSKUs": [
                        "9398111",
                        "9398474"
                    ],
                    "colors": [
                        "Brown"
                    ],
                    "brands": [
                        "Parle",
                        "HIL"
                    ],
                    "sizes": [
                        "Normal",
                        "Square"
                    ],
                    "images": [
                        "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
                    ],
                    "searchKeywords": [
                        "Biscuit"
                    ],
                    "category": [
                        "Food>Snacks>Biscuit"
                    ],
                    "groupID": "B39408",
                    "name": "Parle-G",
                    "description": "biscuits",
                    "regularPriceMin": 7.99,
                    "regularPriceMax": 7.99,
                    "promotionPriceMin": 2.99,
                    "promotionPriceMax": 5.99,
                    "active": true,
                    "products": {
                        "9398111": {
                            "sku": "9398111",
                            "regularPrice": 7.99,
                            "promotionPrice": 2.99,
                            "images": [
                                "https://homepages.cae.wisc.edu/~ece533/images/fruits.png"
                            ],
                            "searchKeywords": [
                                "Biscuit"
                            ],
                            "quantity": 38780,
                            "active": true,
                            "category": [
                                "Food>Snacks>Biscuit"
                            ],
                            "attributes": null,
                            "color": "Brown",
                            "brand": "Parle",
                            "size": "Normal",
                            "isMain": true
                        },
                        "9398474": {
                            "sku": "9398474",
                            "regularPrice": 7.99,
                            "promotionPrice": 5.99,
                            "images": [
                                "https://homepages.cae.wisc.edu/~ece533/images/boat.png"
                            ],
                            "searchKeywords": [
                                "Biscuit"
                            ],
                            "quantity": 4435,
                            "active": true,
                            "category": [
                                "Food>Snacks>Biscuit"
                            ],
                            "attributes": null,
                            "color": "Brown",
                            "brand": "HIL",
                            "size": "Square",
                            "isMain": false
                        }
                    }
                }
            }
        ]
    }
}
```

Use this API endpoint to search a product group in the search index. Please note that product group objects are only returned in the response. 


### HTTP Request

`GET http://api.gallao.io/search/{API version}/search`

### Header

Parameter | Description
--------- | -----------
x-access-token | The access token that you receive upon login

### URL Parameters

Parameter             |               Description
--------------------- | ----------------------------------------
q                     |  Alphanumeric, main query parameter
qfield                |  String, Multiple, query fields
debug                 |  Boolean, to show additional information from search servers
facets                |  Boolean, include standard facets

### Response

      Key             |             Description
--------------------- | ------------------------------------
took                  | query response time
timed_out             | boolean: was the query request timed out
_shards               | details on sharding
hits                  | query matches
aggregations          | Is included when **facets = true**