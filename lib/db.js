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
        // index the database by collection
        return db.index({type:'json', index:{fields:['collection']}});
      }).then(function() {
        // index everything
        return db.index({ type: 'text', index: {}});
      }).then(function() {
        var map = function(doc) {
          if (doc.collection) {
            emit(doc.collection, null);
          }
        };
        var ddoc = {
          _id: '_design/count',
          views: {
            bycollection: {
              map: map.toString(),
              reduce: '_count'
            }
          }
        };
        return db.insert(ddoc);
      });
    }; // create

    // get information about a database
    var info = function() {
      // return counts of documents by collection
      return db.view('count', 'bycollection', {group:true}).then(function(data) {
        var retval = {};
        data.rows.forEach(function(r) {
          retval[r.key] = r.value;
        });
        return retval;
      });
    };

    return {
      create: create,
      info: info,
      list: list,
      collection: require('./collection.js')(cloudant, db, dbname)
    };
  }
};