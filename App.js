var mongoUtil = require('./Database');
var catalog = require('./CatalogApi');

mongoUtil.connectToServer(function (err, client) {

  if (err) console.log(err);

  catalog.main();

});