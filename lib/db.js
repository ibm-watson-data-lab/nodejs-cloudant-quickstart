var sqltomango = require('sqltomango')
var utils = require('./utils.js')
var attempt = require('./attempt.js')
var sha1 = require('./sha1.js')
var bulk = require('./bulk.js')
var request = require('./request.js')

module.exports = function (url, dbname) {
  // connect to Cloudant
  var db = url + '/' + dbname

  // get list of databases
  var list = function () {
    var r = {
      method: 'get',
      url: url + '/_all_dbs'
    }
    return request(r).then(function (data) {
      console.log('DATA', data)
      data = data.filter(function (v) {
        return (v !== '_users' && v !== '_replicator')
      })
      return data
    })
  }

  // create a new empty database
  var create = function (opts) {
    // default behaviour is to index everything
    if (!opts || (typeof opts === 'object' && typeof opts.indexAll !== 'boolean')) {
      opts = { indexAll: true }
    }

    // create a database
    var r = {
      method: 'put',
      url: db
    }
    return request(r).then(function () {
      // stop here if no indexing is required
      if (!opts.indexAll) {
        return {ok: true}
      }

      // index everything
      var r = {
        method: 'post',
        url: db + '/_index',
        body: {type: 'text', index: {}}
      }
      return request(r)
    }).then(function () {
      return {ok: true}
    }).catch(function (e) {
      // if the database alreadt exists, don't throw an error
      if (e.statusCode === 412) {
        return {ok: true}
      } else {
        throw new Error(e.error.reason)
      }
    })
  } // create

  // get information about a database
  var info = function () {
    var r = {
      method: 'get',
      url: db
    }
    return request(r)
  }

  // get all documents in database
  var all = function (opts) {
    if (!opts) {
      opts = {}
    }
    if (!opts.limit) {
      opts.limit = 100
    }
    opts.include_docs = true
    // all docs
    var r = {
      method: 'get',
      url: db + '/_all_docs',
      qs: opts
    }
    return request(r).then(utils.formatOutput)
  }

  // get all desgin documents in database
  var designdocs = function (opts) {
    if (!opts) {
      opts = {}
    }
    opts.include_docs = true
    opts.startkey = JSON.stringify('_design')
    opts.endkey = JSON.stringify('_design0')
    opts.inclusive_end = false
    // all docs
    var r = {
      method: 'get',
      url: db + '/_all_docs',
      qs: opts
    }
    return request(r).then(function (data) {
      // true = leave design docs in place (normally they are stripped out)
      return utils.formatOutput(data, true)
    })
  }

  // explain a SQL query
  var explain = function (sql) {
    if (typeof sql === 'string') {
      return sqltomango.parse(sql)
    } else {
      throw new Error('explain expects a SQL string')
    }
  }

  // query a database
  var query = function (q, opts) {
    // the cloudant query object
    var cq = null

    // if we have a string, assume it's SQL and convert to Mango
    if (typeof q === 'string') {
      cq = sqltomango.parse(q)
    } else if (typeof q === 'object' && q && Object.keys(q).length > 0) {
      // the first object is just the selector
      if (typeof q.selector === 'object') {
        cq = q
      } else {
        cq = { selector: q }
      }
    } else {
      // no query supplied, return empty array
      return new Promise(function (resolve, reject) {
        resolve([])
      })
    }

    // provide sensible default limit
    if (!cq.limit) {
      cq.limit = 100
    }

    if (!opts) {
      opts = {}
    }

    if (opts.sort) {
      if (typeof opts.sort === 'object' && !utils.isArray(opts.sort)) {
        opts.sort = [opts.sort]
      }
      cq.sort = opts.sort
    }
    if (opts.skip) {
      cq.skip = opts.skip
    }
    if (opts.fields) {
      if (typeof opts.fields === 'string') {
        opts.fields = [opts.fields]
      }
      cq.fields = opts.fields
    }

    var r = {
      method: 'post',
      url: db + '/_find',
      body: cq
    }
    return request(r).then(utils.formatOutput)
  }

  // insert a document
  var insert = function (doc) {
    // if array is supplied, do bulk insert
    if (utils.isArray(doc)) {
      return bulk.importArray(db, doc)
    } else {
      // single insert
      var r = {
        method: 'post',
        url: db,
        body: doc
      }
      return request(r).then(utils.formatOutput)
    }
  }

  // update a document
  var update = function (id, doc, merge) {
    if (typeof id === 'object') {
      merge = doc
      doc = JSON.parse(JSON.stringify(id))
      id = doc._id
      delete doc._id
    }
    // special case for _security doc because it has no _rev and has to be a PUT
    if (id === '_security') {
      return attempt.insert(db, id, doc)
    } else {
      merge = !!merge
      return attempt.update(db, id, doc, merge)
    }
  }

  // get a document or a list of documents
  var get = function (id) {
    // single get
    var r = null
    if (!utils.isArray(id)) {
      r = {
        method: 'get',
        url: db + '/' + id
      }
      return request(r).then(utils.formatOutput)
    } else {
      // get list of ids
      r = {
        method: 'get',
        url: db + '/_all_docs',
        qs: {
          keys: JSON.stringify(id),
          include_docs: true
        }
      }
      return request(r).then(function (data) {
        var retval = []
        data.rows.forEach(function (r) {
          if (r.doc) {
            retval.push(utils.formatOutput(r.doc))
          } else {
            retval.push({_id: r.id, _error: r.reason})
          }
        })
        return retval
      })
    }
  }

  // delete a document
  var del = function (id) {
    return attempt.del(db, id)
  }

  // get aggregated count
  var count = function (field) {
    // if no field is provided, return document count
    if (!field) {
      // force a view to be created with counts non-design docs
      // emit(null, null)
      field = [null]
    }

    // make array of fields to aggregate
    if (!utils.isArray(field)) {
      field = [field]
    }
    var f = JSON.stringify(field)
    var hash = sha1('count' + f)

    // generate a map function
    /* istanbul ignore next */
    var map = 'function (doc) {\n\n      var extract = function(f) {\n        if (f) {\n          return doc[f];\n        } else {\n          return null;\n        }\n      };\n\n      var fields = PLACEHOLDER;\n      var key = [];\n      for(var i in fields) {\n        var field = fields[i];\n        var f = extract(field);\n        key.push( f ? f : null);\n      }\n      if (key.length == 1) {\n        key = key[0];\n      }\n      emit(key, null);\n    }'
    map = map.replace('PLACEHOLDER', f)

    // create a design document
    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    }
    doc.views[hash] = {
      map: map,
      reduce: '_count'
    }

    return attempt.update(db, doc._id, doc).then(function () {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        }
      }
      return request(r)
    }).then(function (data) {
      return utils.simplify(data.rows, null, 'count')
    })
  }

  // get aggregated sums
  var sum = function (val, field) {
    // make array of fields to aggregate by
    if (!field) {
      field = null
    }
    if (!utils.isArray(field)) {
      field = [field]
    }
    var f = JSON.stringify(field)

    // make array of fields to get stats on
    if (!val) {
      throw new Error('Missing "val" parameter')
    }
    if (!utils.isArray(val)) {
      val = [val]
    }
    var v = JSON.stringify(val)

    var hash = sha1('sum' + v + f)

    // generate a map function
    /* istanbul ignore next */
    var map = 'function (doc) {\n  var extract = function (f) {\n    if (f) {\n      return doc[f]\n    }\n  }\n\n  var fields = PLACEHOLDER1\n  var values = PLACEHOLDER2\n  var key = []\n  var value = []\n  var i = null\n  if (fields) {\n    for (i in fields) {\n      var field = fields[i]\n      var f = extract(field)\n      key.push(f || null)\n    }\n  }\n  if (value) {\n    for (i in values) {\n      var v = extract(values[i])\n      if (!v) {\n        return\n      }\n      value.push(v || 0)\n    }\n  }\n  if (key.length == 1) {\n    key = key[0]\n  }\n  if (value.length == 1) {\n    value = value[0]\n  }\n  emit(key, value)\n}'
    map = map.replace('PLACEHOLDER1', f).replace('PLACEHOLDER2', v)

    // check to see if we have this view already
    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    }
    doc.views[hash] = {
      map: map,
      reduce: '_sum'
    }

    return attempt.update(db, doc._id, doc).then(function () {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        }
      }
      return request(r)
    }).then(function (data) {
      return utils.simplify(data.rows, val, 'sum')
    })
  }

  // get aggregated stats
  var stats = function (val, field) {
    // make array of fields to aggregate by
    if (!field) {
      field = null
    }
    if (!utils.isArray(field)) {
      field = [field]
    }
    var f = JSON.stringify(field)

    // make array of fields to get stats on
    if (!val) {
      throw new Error('Missing "val" parameter')
    }
    if (!utils.isArray(val)) {
      val = [val]
    }
    var v = JSON.stringify(val)

    var hash = sha1('stats' + v + f)

    // generate a map function
    /* istanbul ignore next */
    var map = 'function (doc) {\n  var extract = function (f) {\n    if (f) {\n      return doc[f]\n    }\n  }\n\n  var fields = PLACEHOLDER1\n  var values = PLACEHOLDER2\n  var key = []\n  var value = []\n  var i = null\n  if (fields) {\n    for (i in fields) {\n      var field = fields[i]\n      var f = extract(field)\n      key.push(f || null)\n    }\n  }\n  if (value) {\n    for (i in values) {\n      var v = extract(values[i])\n      if (!v) {\n        return\n      }\n      value.push(v || 0)\n    }\n  }\n  if (key.length == 1) {\n    key = key[0]\n  }\n  if (value.length == 1) {\n    value = value[0]\n  }\n  emit(key, value)\n}'
    map = map.replace('PLACEHOLDER1', f).replace('PLACEHOLDER2', v)

    // check to see if we have this view already
    var doc = {
      _id: '_design/' + hash,
      views: {
      }
    }
    doc.views[hash] = {
      map: map,
      reduce: '_stats'
    }

    return attempt.update(db, doc._id, doc).then(function () {
      // query the view
      var r = {
        method: 'get',
        url: db + '/_design/' + hash + '/_view/' + hash,
        qs: {
          group: true
        }
      }
      return request(r)
    }).then(function (data) {
      return utils.simplify(data.rows, val, 'stats')
    })
  }

  // create a new API user and assign it some permissions
  var createUser = function (permissions) {
    if (typeof permissions === 'string') {
      permissions = [permissions]
    }
    if (!permissions) {
      permissions = ['_reader']
    }
    var r = {
      method: 'post',
      url: url + '/_api/v2/api_keys'
    }
    var u = null
    return request(r).then(function (user) {
      u = user
      r = {
        method: 'get',
        url: url + '/_api/v2/db/' + dbname + '/_security'
      }
      return request(r)
    }).then(function (security) {
      if (!security.cloudant) {
        security.cloudant = {}
      }
      security.cloudant[u.key] = permissions
      r = {
        method: 'put',
        url: url + '/_api/v2/db/' + dbname + '/_security',
        body: security
      }
      return request(r)
    }).then(function (data) {
      return u
    })
  }

  // delete a user
  var deleteUser = function (username) {
    if (!username) {
      throw new Error('missing username parameter')
    }
    var r = {
      method: 'get',
      url: url + '/_api/v2/db/' + dbname + '/_security'
    }
    return request(r).then(function (security) {
      delete security.cloudant[username]
      r = {
        method: 'put',
        url: url + '/_api/v2/db/' + dbname + '/_security',
        body: security
      }
      return request(r)
    })
  }

  // get all databases
  var dbs = function () {
    var r = {
      method: 'get',
      url: url + '/_all_dbs'
    }
    return request(r)
  }

  // delete databases
  var deleteDB = function () {
    var r = {
      method: 'delete',
      url: db
    }
    return request(r)
  }

  return {
    create: create,
    info: info,
    list: list,
    all: all,
    designdocs: designdocs,
    query: query,
    explain: explain,
    insert: insert,
    update: update,
    upsert: update,
    get: get,
    del: del,
    delete: del,
    count: count,
    sum: sum,
    stats: stats,
    createUser: createUser,
    deleteUser: deleteUser,
    dbs: dbs,
    deleteDB: deleteDB
  }
}
