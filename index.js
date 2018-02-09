var url = require('url')

module.exports = function (u, dbname) {
  var parsed = url.parse(u)
  if (!parsed.hostname || !parsed.protocol) {
    throw new Error('invalid url')
  }
  if (parsed.pathname === '/' && !dbname) {
    throw new Error('no database name provided')
  }
  if (!dbname) {
    dbname = parsed.pathname.replace(/^\//, '')
  }
  delete parsed.pathname
  delete parsed.path
  u = url.format(parsed).replace(/\/$/, '')
  return require('./lib/db.js')(u, dbname)
}
