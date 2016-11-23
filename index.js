
module.exports = function(url) {

  // create a cloudant instance that connects to the supplied url
  // run it in Promises modes
  var cloudant = require('cloudant')({url: url, plugin:'promises'});

  return require('./lib/db.js')(cloudant);  
};