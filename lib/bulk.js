var request = require('./request.js')
var utils = require('./utils.js')
var qrate = require('qrate')

var importArray = function (db, docs) {
  var bufferSize = 500
  var parallelism = 5
  var rateLimit = 5
  var written = 0
  var totalfailed = 0

  // a queue that writes things to the database in bulk
  var q = qrate(function (payload, cb) {
    var r = {
      method: 'post',
      url: db + '/_bulk_docs',
      body: payload,
      json: true
    }
    request(r).then(function (data) {
      var ok = 0
      var failed = 0
      for (var i in data) {
        var d = data[i]
        var isok = !!((d.id && d.rev))
        if (isok) {
          ok++
        } else {
          failed++
        }
      }
      written += ok
      totalfailed += failed
      cb()
    }).catch(function (e) {
      totalfailed += payload.docs.length
      cb()
    })
  }, parallelism, rateLimit)

  // return a Promise
  var p = new Promise(function (resolve, reject) {
    // when the queue is drained, resolve the promise
    q.drain = function () {
      q.kill()
      resolve({ok: true, success: written, failed: totalfailed})
    }

    // add the docs to a queue in blocks of 500
    var work = utils.clone(docs)
    do {
      var size = Math.min(work.length, bufferSize)
      var toSend = work.splice(0, size)
      q.push({docs: toSend})
    } while (work.length > 0)
  })

  return p
}

module.exports = {
  importArray: importArray
}
