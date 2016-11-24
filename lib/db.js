var utils = require('./utils.js');
var attempt = require('./attempt.js');

module.exports = function(cloudant) {

  // return a function that lets you create a database
  return function(dbname) {
    
    // connect to Cloudant
    var db = cloudant.db.use(dbname);

    // get list of databases
    var list = function() {
      return cloudant.db.list().then(function(data) {
        data = data.filter(function(v) {
          return (v !== '_users' && v !== '_replicator');
        });
        return data;
      });
    };

    // create a new empty database
    var create = function() {
      // create a database
      return cloudant.db.create(dbname).then(function() {
        // index everything
        return db.index({ type: 'text', index: {}});
      }).then(function() {
        return {ok: true};
      });
    }; // create

    // get information about a database
    var info = function() {
      return db.info();
    };
    
    // get all documents in database or query it
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
        return db.find({selector: q}).then(utils.formatOutput);
      } else {
        // all docs
        return db.list({include_docs: true}).then(utils.formatOutput);
      };
    };

    // insert a document
    var insert = function(doc) {
      var ts = new Date().getTime();
      // if array is supplied, do bulk insert
      if (utils.isArray(doc)) {
        return db.bulk({docs: doc}).then(utils.formatOutput);
      } else {
        // single insert
        return db.insert(doc).then(utils.formatOutput);
      }
    };

    // update a document
    var update = function(id, doc) {
      return attempt.update(cloudant, dbname, id, doc);
    };

    // get a document or a list of documents
    var get = function(id) {
      if (!utils.isArray(id)) {
        return db.get(id).then(utils.formatOutput);
      } else {
        return db.list({keys:id, include_docs: true}).then(function(data) {
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
  
    // delete a document
    var del = function(id) {
      return attempt.del(cloudant, dbname, id);
    };

    return {
      create: create,
      info: info,
      list: list,
      all: all,
      query: all,
      insert: insert,
      update: update,
      get: get,
      del: del
    };
  }
};