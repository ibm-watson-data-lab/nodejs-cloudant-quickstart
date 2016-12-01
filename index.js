var url = require('url');

module.exports = function(u) {
  var parsed = url.parse(u);
  if (!parsed.hostname || !parsed.protocol) {
    throw new Error('invalid url');
  }
  delete parsed.pathname;
  delete parsed.path;
  u = url.format(parsed);
  return require('./lib/db.js')(u);  
};