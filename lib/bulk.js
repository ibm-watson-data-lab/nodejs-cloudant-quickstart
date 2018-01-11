
var async = require('async');
var request = require('./request.js');
var utils = require('./utils.js');

var importArray = function(db, docs) {
  
  var buffer = [ ],
    buffer_size = 500,
    parallelism = 5,
    written = 0,
    totalfailed = 0;

  // a queue that writes things to the database in bulk
  var q = async.queue(function(payload, cb) {
    var r = {
      method: 'post',
      url: db + '/_bulk_docs',
      body: payload,
      json: true
    };
    request(r).then(function(data) {
      var ok = 0,
        failed = 0;
      for(var i in data) {
        var d = data[i];
        var isok = (d.id && d.rev)?true:false;
        if (isok) {
          ok++;
        } else {
          failed++;
        }
      }
      written += ok;
      totalfailed += failed;
      cb();
    }).catch(function(e) {
      totalfailed += payload.docs.length;
      cb();
    });
  }, parallelism);  

  // return a Promise
  var p = new Promise(function(resolve, reject) {

    // when the queue is drained, resolve the promise
    q.drain = function() {
      resolve({ ok:true, success: written , failed: totalfailed});
    };

    // add the docs to a queue in blocks of 500
    var work = utils.clone(docs);
    do {
      var size = Math.min(work.length, buffer_size);
      var toSend = work.splice(0, size);
      q.push({docs: toSend});
    } while(work.length > 0);

  });

  return p;
};

module.exports = {
  importArray: importArray
};