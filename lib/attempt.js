var async = require('async');
var request = require('./request.js');

var del = function(db, id) {

  return new Promise(function(resolve, reject) {
    // fetch document to get rev token
    var fetchAndDelete = function(done) {
      var r = {
        method: 'get',
        url: db + '/' + id,
        json: true
      };
      request(r, function(err, h, data) {
        var sc = (h && h.statusCode) || 500;
        if (err || sc >= 400) {
          return done({ok: false, statusCode: sc});
        }

        var r = {
          method: 'delete',
          url: db + '/' + id,
          qs: {
            rev: data._rev
          },
          json: true
        };
        request(r, function(err, h, data) {
          var sc = (h && h.statusCode) || 500;
          if (err || sc >= 400) {
            return done({ok: false, statusCode: sc});
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

var update = function(db, id, doc) {

  // add the id to the document
  doc._id = id;
  
  return new Promise(function(resolve, reject) {

    // fetch document to get rev token
    var fetchAndUpdate = function(done) {
      var r = {
        method: 'get',
        url: db + '/' + id,
        json: true
      };
      request(r, function(e, h, data) {
        var sc = (h && h.statusCode) || 500;
        if (!e && sc < 300) {
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
          doc._rev = data._rev;
        }
        doc._id = id;

        var r = {
          method: 'post',
          url: db,
          body: doc,
          json: true
        };
        request(r, function(err, h, data) {
          var sc = (h && h.statusCode) || 500;
          if (!err && sc < 400) {
            done(null, { ok: true });
          } else {
            done({ok: false, statusCode: sc});
          }
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
};

module.exports = {
  del: del,
  update: update
}