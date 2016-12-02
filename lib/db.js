var utils = require('./utils.js');
var attempt = require('./attempt.js');
var sha1 = require('./sha1.js');
var bulk = require('./bulk.js');
var request = require('request-promise-native');

module.exports = function(url, dbname) {

  // connect to Cloudant
  var db = url + '/' + dbname;
  var ddoc = require('./ddoc.js')(db);

  // get list of databases
  var list = function() {
    var r = {
      method: 'get',
      url: url + '/_all_dbs',
      json: true
    };
    return request(r).then(function(data) {
      data = data.filter(function(v) {
        return (v !== '_users' && v !== '_replicator');
      });
      return data;
    });
  };

  // create a new empty database
  var create = function() {
    // create a database
    var r = {
      method: 'put',
      url: db,
      json: true
    };
    return request(r).then(function() {
      // index everything
      var r = {
        method: 'post',
        url: db + '/_index',
        body: { type: 'text', index: {}},
        json: true
      };
      return request(r);
    }).then(function() {
      return {ok: true};
    });
  }; // create

  // get information about a database
  var info = function() {
    var r = {
      method: 'get',
      url: db,
      json:true
    };
    return request(r);
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
    var r = {
      method: 'get',
      url: db + '/_all_docs',
      qs: opts,
      json: true
    };
    return request(r).then(utils.formatOutput);
  };

  // query a database
  var query = function(q, sort, skip) {
    if (q && Object.keys(q).length > 0) {
      var cq = {selector: q, limit: 100};
      if (sort) {
        if (typeof sort === 'string') {
          var obj = {};
          obj[sort + ':string'] = 'asc';
          sort = [ obj ];
        }
        cq.sort = sort;
      }
      if (skip) {
        cq.skip = skip;
      }
      var r = {
        method: 'post',
        url: db + '/_find',
        body: cq,
        json: true
      };
      return request(r).then(utils.formatOutput);
    } else {
      // no query supplied, return empty array
      return new Promise(function(resolve, reject) {
        resolve([]);
      });
    };
  };

  // insert a document
  var insert = function(doc) {
    var ts = new Date().getTime();
    // if array is supplied, do bulk insert
    if (utils.isArray(doc)) {
      return bulk.importArray(db, doc);
    } else {
      // single insert
      var r = {
        method: 'post',
        url: db,
        body: doc,
        json: true
      };
      return request(r).then(utils.formatOutput);
    }
  };

  // update a document
  var update = function(id, doc) {
    if (typeof id === 'object' && typeof doc === 'undefined') {
      doc = id;
      id = doc._id;
      delete doc._id;
    }
    return attempt.update(db, id, doc);
  };

  // get a document or a list of documents
  var get = function(id) {
    // single get
    if (!utils.isArray(id)) {
      var r = {
        method: 'get',
        url: db + '/' + id,
        json: true
      };
      return request(r).then(utils.formatOutput);
    } else {
      // get list of ids
      var r = {
        method: 'get',
        url: db + '/_all_docs',
        qs: {
          keys: JSON.stringify(id),
          include_docs: true
        },
        json: true
      };
      return request(r).then(function(data) {
        var retval = [];
        data.rows.forEach(function(r) {
          if (r.doc) {
            retval.push(utils.formatOutput(r.doc));
          } else {
            retval.push({ _id: r.id, _error: r.reason});
          }
        });
        return retval;
      })
    }
  };

  // delete a document
  var del = function(id) {
    return attempt.del(db, id);
  };

  // get aggregated count
  var count = function(field) {
      
    // if no field is provided, return document count
    if (!field)  {
      // force a view to be created with counts non-design docs
      // emit(null, null)
      field = [null];
    }

    // make array of fields to aggregate
    if (!utils.isArray(field)) {
      field = [field];
    }
    var f = JSON.stringify(field)
    var hash = sha1('count' + f);

    // generate a map function
    /* istanbul ignore next */
    var map = function(doc) {

      var extract = function(f) {
        if (f) {
          if (f.match(/[^a-zA-Z_$0-9.]/g)) {
            return null;
          }
          return eval('doc.'+f);
        } else {
          return null;
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

    // create a design document
    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    };
    doc.views[hash] = {
      map: map,
      reduce: '_count'
    };

    return attempt.update(db, doc._id, doc).then(function() {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        },
        json: true
      };
      return request(r);
    }).then(function(data) {
      return utils.simplify(data.rows);
    });
  };

  // get aggregated sums
  var sum = function(val, field) {

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
      throw new Error('Missing "val" parameter');;
    }
    if (!utils.isArray(val)) {
      val = [val];
    }
    var v = JSON.stringify(val);

    var hash = sha1('sum' + v + f);

    // generate a map function
    /* istanbul ignore next */
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
    var id = '_design/' + hash;

    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    };
    doc.views[hash] = {
      map: map,
      reduce: '_sum'
    };

    return attempt.update(db, doc._id, doc).then(function() {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        },
        json: true
      };
      return request(r)
    }).then(function(data) {
      return utils.simplify(data.rows, val);
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
      throw new Error('Missing "val" parameter');;
    }
    if (!utils.isArray(val)) {
      val = [val];
    }
    var v = JSON.stringify(val);

    var hash = sha1('stats' + v + f);

    // generate a map function
    /* istanbul ignore next */
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
    var id = '_design/' + hash;

    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    };
    doc.views[hash] = {
      map: map,
      reduce: '_stats'
    };

    return attempt.update(db, doc._id, doc).then(function() {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        },
        json: true
      };
      return request(r);
    }).then(function(data) {
      return utils.simplify(data.rows, val);
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
    upsert: update,
    get: get,
    del: del,
    delete: del,
    count: count,
    sum: sum,
    stats: stats
  };
};