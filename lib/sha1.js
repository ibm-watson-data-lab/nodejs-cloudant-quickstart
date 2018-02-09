var crypto = require('crypto')

var sha1 = function (string) {
  if (typeof string !== 'string' || !string) {
    return null
  }
  return crypto.createHash('sha1').update(string).digest('hex')
}

module.exports = sha1
