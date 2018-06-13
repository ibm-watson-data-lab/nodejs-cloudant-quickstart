var rp = require('request-promise-native')
var rc = require('request')

// set defaults
// - add user-agent header
// - accept gzip headers
// - add keep-alive user agent
var pkg = require('../package.json')
var useragent = pkg.name + '/' + pkg.version + ' (Node.js ' + process.version + ')'

module.exports = function (r, callback) {
  var DEBUG = process.env.DEBUG
  var debugon = (DEBUG && DEBUG.match(/cloudant-quickstart/))
  if (debugon) {
    console.log(r.method.toUpperCase(), r.url.replace(/\/\/(.*)@/, '//XXXXXX:XXXXXX@'), r.qs ? r.qs : '-', r.body ? r.body : '-')
  }
  r.headers = {'User-agent': useragent}
  r.gzip = true
  r.json = true
  if (callback) {
    return rc(r, callback)
  } else {
    return rp(r)
  }
}
