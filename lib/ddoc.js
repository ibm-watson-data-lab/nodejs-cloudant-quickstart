var request = require('./request.js')

module.exports = function (url) {
  // get the design doc or return a blank one
  var get = function (id) {
    var r = {
      method: 'get',
      url: url + '/' + id,
      json: true
    }
    return request(r).catch(function () {
      return {_id: id, views: {}}
    })
  }

  return {
    get: get
  }
}
