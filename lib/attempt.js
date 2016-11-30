var async = require('async');

var del = function(cloudant, dbname, id) {
  var db = cloudant.db.use(dbname);
  return new Promise(function(resolve, reject) {
    // fetch document to get rev token
    var fetchAndDelete = function(done) {
      db.get(id, function(err, data) {
        if (err) {
          return done({ok: false, msg: 'document does not exist', statusCode: 404});
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

var update = function(cloudant, dbname, id, doc) {

  var db = cloudant.db.use(dbname);
  
  // add the id to the document
  doc._id = id;
  
  return new Promise(function(resolve, reject) {

    // fetch document to get rev token
    var fetchAndUpdate = function(done) {
      db.get(id, function(err, data) {

        // if we have a pre-existing document
        if (!err) {

          // check to see if we need to do any further work
          // if the our document is the same as the one in the db
          // we needn't do anything
          var a1 = doc;
          var a2 = JSON.parse(JSON.stringify(data)); // clone
          delete a1._rev;
          delete a2._rev;
          delete a1._id;
          delete a2._id;
          if (JSON.stringify(a1) === JSON.stringify(a2)) {
            return done(null, {ok: true});
          }

          // insert the existing document's rev token
          doc._rev = data._rev
          doc._id = data._id;
        }

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