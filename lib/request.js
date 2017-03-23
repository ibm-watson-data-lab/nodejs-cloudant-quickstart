var rp = require('request-promise-native');
var rc = require('request');


module.exports = function(r, callback) {
  var DEBUG = process.env.DEBUG;
  var debugon = (DEBUG && DEBUG.match(/silverlining/));
  if (debugon) {
    console.log(r.method.toUpperCase(), r.url.replace(/\/\/(.*)@/,"//XXXXXX:XXXXXX@"), r.qs?r.qs:'-', r.body?r.body:'-');
  }
  if (callback) {
    return rc(r, callback);
  } else {
    return rp(r);
  }
};