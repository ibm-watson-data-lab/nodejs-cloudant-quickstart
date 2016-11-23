var async = require('async');

var del = function(cloudant, dbname, collection, id, callback) {
  var db = cloudant.db.use(dbname);
  return new Promise(function(resolve, reject) {
    // fetch document to get rev token
    var fetchAndDelete = function(done) {
      db.get(id, function(err, data) {
        if (err) {
          return done({ok: false, msg: 'document does not exist', statusCode: 404});
        }
        if (data.collection !== collection) {
          return done({ok: false, msg: 'document is not in the collection', statusCode: 404});
        }
        db.destroy(id, data._rev, function(err, data) {
          if (err) {
            return done({ok: false, msg: err.msg, statusCode: err.statusCode});
          }
          done(null, {ok: true});
        });
      });
    };

    async.retry({
      times: 3,
      interval: function(retryCount) {
        return 50 * Math.pow(2, retryCount);
      }
    }, fetchAndDelete, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve({ok: true});
      }
    });

  });

  
};

var update = function(cloudant, dbname, collection, id, doc, callback) {

  var db = cloudant.db.use(dbname);
  return new Promise(function(resolve, reject) {

    // fetch document to get rev token
    var fetchAndUpdate = function(done) {
      db.get(id, function(err, data) {
        if (err) {
          return done({ok: false, msg: 'document does not exist', statusCode: 404});
        }
        if (data.collection !== collection) {
          return done({ok: false, msg: 'document is not in the collection', statusCode: 404});
        }
        doc._id = data._id;
        doc._rev = data._rev
        db.insert(doc, function(err, data) {
          if (err) {
            return done({ok: false, msg: err.msg, statusCode: err.statusCode});
          }
          done(null, {ok: true});
        });
      });
    };

    async.retry({
      times: 3,
      interval: function(retryCount) {
        return 50 * Math.pow(2, retryCount);
      }
    }, fetchAndUpdate, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve({ok: true});
      }
    });

  });

}

module.exports = {
  del: del,
  update: update
}