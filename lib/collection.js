var utils = require('./utils.js');
var attempt = require('./attempt.js');

module.exports = function(cloudant, db, dbname) {

  return function(collectionName) {

    var insert = function(doc) {
      var ts = new Date().getTime();
      // if array is supplied, do bulk insert
      if (utils.isArray(doc)) {
        doc.map(function(d) {
          d.collection = collectionName;
          d.ts = ts;
          return d;
        });
        return db.bulk({docs: doc}).then( function(data) {
          return utils.formatOutput(data);
        });
      } else {
        // single insert
        doc.collection = collectionName;
        doc.ts = ts;
        return db.insert(doc).then(function(data) {
          return utils.formatOutput(data);
        });
      }
    };

    var update = function(id, doc) {
      // if array is supplied, do bulk insert
      doc.collection = collectionName;
      doc.ts = new Date().getTime();
      return attempt.update(cloudant, dbname, collectionName, id, doc);
    };

    var all = function(query) {
      if (query && Object.keys(query).length > 0) {
        var q = null;
        // ="{'name':'restheart'}"
        if (query._filter) {
          try {
            var q = JSON.parse(query._filter);
          } catch(e) {
            res.status(400).send({ok: false, msg: '_filter paramter is not JSON'});
          }
        }
        if (!q) {
          q = query;
        }
        var selector = { '$and': [ 
          {collection: collectionName},
          q ]};
        return db.find({selector: selector}).then(utils.formatOutput);
      } else {
        // all docs
        var selector = { collection: collectionName};
        return db.find({selector: selector}).then(utils.formatOutput);
      };

    }

    var filter = function(query) {
      return all(query);
    };

    var get = function(id) {
      var ids = id.split(',');
      if (ids.length == 1) {
        return db.get(ids[0]);
      } else {
        return db.list({keys:ids, include_docs: true}).then(function(data) {
          var retval = [];
          if (data) {
            data.rows.forEach(function(r) {
              if (r.doc) {
                retval.push(utils.formatOutput(r.doc));
              } else {
                retval.push({ _id: r.key, _error: r.error});
              }
            });
          }

          return retval;
        })
      }
    };

    var del = function(id) {
      return attempt.del(cloudant, dbname, collectionName, id);
    };

    return {
      insert: insert,
      update: update,
      all: all,
      filter: all,
      get: get,
      del: del
    };
  };

};