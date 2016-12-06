var request = require('request-promise-native');


module.exports = function(r, callback) {
  var DEBUG = process.env.DEBUG;
  var debugon = (DEBUG && DEBUG.match(/simplenosql/));
  if (debugon) {
    console.log(r.method.toUpperCase(), r.url.replace(/\/\/(.*)@/,"//XXXXXX:XXXXXX@"), r.qs?r.qs:'-', r.body?r.body:'-');
  }
  return request(r, callback);
}