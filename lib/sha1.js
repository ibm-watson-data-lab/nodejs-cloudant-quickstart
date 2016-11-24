var crypto = require('crypto');

var sha1 = function(string) {
  return crypto.createHash('sha1').update(string).digest('hex');
};

module.exports = sha1;