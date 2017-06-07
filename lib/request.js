var rp = require('request-promise-native');
var rc = require('request');
var https =  require('https');

// set defaults
// - add user-agent header
// - accept gzip headers
// - add keep-alive user agent
var pkg = require('../package.json');
var useragent = 'silverlining/' + pkg.version + ' (Node.js ' + process.version + ')';
var agent = new (https.Agent)({ keepAlive:true });

module.exports = function(r, callback) {
  var DEBUG = process.env.DEBUG;
  var debugon = (DEBUG && DEBUG.match(/silverlining/));
  if (debugon) {
    console.log(r.method.toUpperCase(), r.url.replace(/\/\/(.*)@/,"//XXXXXX:XXXXXX@"), r.qs?r.qs:'-', r.body?r.body:'-');
  }
  r.headers = { 'User-agent': useragent};
  r.gzip = true;
  r.agent = agent;
  r.json = true;
  if (callback) {
    return rc(r, callback);
  } else {
    return rp(r);
  }
};