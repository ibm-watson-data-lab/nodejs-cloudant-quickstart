var utils = require('./utils.js');
var attempt = require('./attempt.js');
var sha1 = require('./sha1.js');

module.exports = function(cloudant) {



  // return a function that lets you create a database
  return function(dbname) {
    
    // connect to Cloudant
    var db = cloudant.db.use(dbname);
    var ddoc = require('./ddoc.js')(db);

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
    
    // get all documents in database 
    var all = function(opts) {
      if (!opts) {
        opts = {};
      }
      if (!opts.limit || opts.limit > 100) {
        opts.limit = 100;
      }
      opts.include_docs = true;
      // all docs
      return db.list(opts).then(utils.formatOutput);
    };

    // query a database
    var query = function(qq) {
      if (qq && Object.keys(qq).length > 0) {
        var q = null;
        // ="{'name':'restheart'}"
        if (qq._filter) {
          try {
            var q = JSON.parse(qq._filter);
          } catch(e) {
            res.status(400).send({ok: false, msg: '_filter paramter is not JSON'});
          }
        }
        if (!q) {
          q = qq;
        }
        return db.find({selector: q}).then(utils.formatOutput);
      } else {
        // all nothing
        return [];
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

    // get aggregated count
    var count = function(field) {
       
      // if no field is provided, return document count
      if (!field)  {
        return db.info().then(function(data) {
          return [ { key: null,  value: data.doc_count }];
        });
      }

      // make array of fields to aggregate
      if (!utils.isArray(field)) {
        field = [field];
      }
      var f = JSON.stringify(field)
      var hash = sha1(f);

      // generate a map function
      var map = function(doc) {

        var extract = function(f) {
          if (f) {
            if (f.match(/[^a-zA-Z_$0-9.]/g)) {
              return null;
            }
            return eval('doc.'+f);
          } 
        };

        var fields = PLACEHOLDER;
        var key = [];
        for(var i in fields) {
          var field = fields[i];
          var f = extract(field);
          key.push( f ? f : null);
        }
        if (key.length == 1) {
          key = key[0];
        }
        emit(key, null);
      }.toString().replace('PLACEHOLDER', f);

      // check to see if we have this view already
      var id = '_design/aggregation';
      return ddoc.get(id).then(function(doc) {

        // if we have this view
        if (doc.views[hash]) {
          // no need to update the design doc
          return true;
        } else {
          // add the new design doc to the view
          doc.views[hash] = {
            map: map,
            reduce: '_count'
          };
          return attempt.update(cloudant, dbname, id, doc)
        }
      }).then(function(data) {
        // query the view
        return db.view('aggregation', hash, {group:true});
      }).then(function(data) {
        return data.rows;
      });
    };

    // get aggregated stats
    var stats = function(val, field) {

      // make array of fields to aggregate by
      if (!field) {
        field = null;
      }
      if (!utils.isArray(field)) {
        field = [field];
      }
      var f = JSON.stringify(field);

      // make array of fields to get stats on
      if (!val) {
        return null;
      }
      if (!utils.isArray(val)) {
        val = [val];
      }
      var v = JSON.stringify(val);

      var hash = sha1(v+f);

      // generate a map function
      var map = function(doc) {

        var extract = function(f) {
          if (f) {
            if (f.match(/[^a-zA-Z_$0-9.]/g)) {
              return null;
            }
            return eval('doc.'+f);
          } 
        };

        var fields = PLACEHOLDER1;
        var values = PLACEHOLDER2;
        var key = [];
        var value = []
        if (fields) {
          for(var i in fields) {
            var field = fields[i];
            var f = extract(field);
            key.push( f ? f : null);
          }
        }
        if (value) {
          for(var i in values) {
            var v = extract(values[i]);
            if (!v) {
              return;
            }
            value.push( v ? v : 0);
          }
        }
        if (key.length == 1) {
          key = key[0];
        }
        if (value.length ==1) {
          value = value[0];
        }
        emit(key, value);
      }.toString().replace('PLACEHOLDER1', f).replace('PLACEHOLDER2', v);

      // check to see if we have this view already
      var id = '_design/aggregation';
      return ddoc.get(id).then(function(doc) {

        // if we have this view
        if (doc.views[hash]) {
          // no need to update the design doc
          return true;
        } else {
          // add the new design doc to the view
          doc.views[hash] = {
            map: map,
            reduce: '_stats'
          };
          return attempt.update(cloudant, dbname, id, doc)
        }
      }).then(function(data) {
        // query the view
        return db.view('aggregation', hash, {group:true});
      }).then(function(data) {
        return data.rows;
      });
    };


    return {
      create: create,
      info: info,
      list: list,
      all: all,
      query: query,
      insert: insert,
      update: update,
      get: get,
      del: del,
      count: count,
      stats: stats
    };
  }
};