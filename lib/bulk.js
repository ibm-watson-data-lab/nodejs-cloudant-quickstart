
var async = require('async');

var importArray = function(cloudant, dbname, docs) {
  
  var buffer = [ ],
    buffer_size = 500,
    parallelism = 5,
    written = totalfailed = 0,
    db = cloudant.db.use(dbname);

  // a queue that writes things to the database in bulk
  var q = async.queue(function(payload, cb) {
    db.bulk(payload, function(err, data) {
      if (!err) {
        var ok = failed = 0;
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
        totalfailed += failed
      } else {
        totalfailed += payload.docs.length;
      }
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
    do {
      var size = Math.min(docs.length, buffer_size);
      var toSend = docs.splice(0, size);
      q.push({docs: toSend});
    } while(docs.length >0);

  });

  return p;
};

module.exports = {
  importArray: importArray
}