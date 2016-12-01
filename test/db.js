var assert = require('assert');

var SERVER = 'https://myaccount.cloudant.com';
var url = SERVER + '/mydb';
var db = require('../index.js')(url);
var nosql = db;
var nock = require('nock');

describe('db', function() {

  it('should be an object', function() {
    assert(typeof db, 'object');
  });

  it('should have the requisite functions', function() {
    assert(typeof db.create, 'function');
    assert(typeof db.info, 'function');
    assert(typeof db.list, 'function');
    assert(typeof db.query, 'function');
    assert(typeof db.insert, 'function');
    assert(typeof db.update, 'function');
    assert(typeof db.upsert, 'function');
    assert(typeof db.get, 'function');
    assert(typeof db.del, 'function');
    assert(typeof db.delete, 'function');
    assert(typeof db.count, 'function');
    assert(typeof db.stats, 'function');                    
  });

  it('list - should get databases without _users & _replicator', function() {
    var mocks = nock(SERVER)
      .get('/_all_dbs').reply(200, ['_users','_replicator','a','b','c']);
    return nosql.list().then(function(data) {
      assert.deepEqual(data, ['a','b','c']);
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('create - should create a database with indexes where db did not exist', function() {
    var mocks = nock(SERVER)
      .put('/mydb').reply(200, {ok:true})
      .post('/mydb/_index', { type: 'text', index: {}}).reply(200, {result: 'created'});
    return nosql.create().then(function() {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('create - should fail when db exists', function() {
    var mocks = nock(SERVER)
      .put('/mydb').reply(412, {ok:false, err:'failed', reason:'exists'});
    return nosql.create().then(function(data) {
      assert(false);
    }).catch(function(err) {
      assert(mocks.isDone());
    });
  });

  it('info - should get database information', function() {
    var reply = {
      "update_seq": "a",
      "db_name": "mydb",
      "sizes": {
        "file": 46114703224,
        "external": 193164408719,
        "active": 34961621142
      },
      "purge_seq": 0,
      "other": {
        "data_size": 193164408719
      },
      "doc_del_count": 5564,
      "doc_count": 9818541,
      "disk_size": 46114703224,
      "disk_format_version": 6,
      "compact_running": true,
      "instance_start_time": "0"
    };
    var mocks = nock(SERVER)
      .get('/mydb').reply(200, reply);
    return nosql.info().then(function(data) {
      assert.deepEqual(data, reply);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('get - should get an single document', function() {
    var reply =  { _id: '1', _rev:'1-123', a:1};
    var mocks = nock(SERVER)
      .get('/mydb/1').reply(200, reply);
    return nosql.get('1').then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data._id, '1');
      assert.equal(typeof data._rev, 'undefined');
      assert.equal(data.a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('get - should get an array of documents', function() {
    var reply = {
      total_rows: 3,
      rows: [
        { id: '1', key: '1', value: { rev: '1-123'}, doc: { _id: '1', _rev:'1-123', a:1}},
        { id: '2', key: '2', value: { rev:'1-123'}, doc: { _id: '2', _rev:'1-123', a:2}}
      ]
    };
    var mocks = nock(SERVER)
      .get('/mydb/_all_docs?keys=%5B%221%22%2C%222%22%5D&include_docs=true').reply(200, reply);
    return nosql.get(['1','2']).then(function(data) {
      assert.equal(data.length, 2);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('get - should get an array of documents with errors', function() {
    var reply = {
      total_rows: 3,
      rows: [
        { id: '1', key: '1', value: { rev: '1-123'}, doc: { _id: '1', _rev:'1-123', a:1}},
        { id: '2', err:'not_found', reason: 'missing' }
      ]
    };
    var mocks = nock(SERVER)
      .get('/mydb/_all_docs?keys=%5B%221%22%2C%222%22%5D&include_docs=true').reply(200, reply);
    return nosql.get(['1','2']).then(function(data) {
      assert.equal(data.length, 2);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert.equal(data[1]._id, '2');
      assert.equal(typeof data[1]._error, 'string');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('all - should get all documents', function() {
    var reply = {
      total_rows: 3,
      rows: [
        { id: '1', key: '1', value: { rev: '1-123'}, doc: { _id: '1', _rev:'1-123', a:1}},
        { id: '2', key: '2', value: { rev:'1-123'}, doc: { _id: '2', _rev:'1-123', a:2}},
        { id: '3', key: '3', value: { rev:'1-123'}, doc: { _id: '3', _rev:'1-123', a:3}},
      ]
    };
    var mocks = nock(SERVER)
      .get('/mydb/_all_docs?limit=100&include_docs=true').reply(200, reply);
    return nosql.all().then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('all - should get with skip and limit 1', function() {
    var reply = {
      total_rows: 3,
      rows: [
        { id: '1', key: '1', value: { rev: '1-123'}, doc: { _id: '1', _rev:'1-123', a:1}},
        { id: '2', key: '2', value: { rev:'1-123'}, doc: { _id: '2', _rev:'1-123', a:2}},
        { id: '3', key: '3', value: { rev:'1-123'}, doc: { _id: '3', _rev:'1-123', a:3}},
      ]
    };
    var mocks = nock(SERVER)
      .get('/mydb/_all_docs?limit=3&include_docs=true').reply(200, reply);
    return nosql.all({limit:3}).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('all - should get with skip and limit 2', function() {
    var reply = {
      total_rows: 3,
      rows: [
        { id: '1', key: '1', value: { rev: '1-123'}, doc: { _id: '1', _rev:'1-123', a:1}},
        { id: '2', key: '2', value: { rev:'1-123'}, doc: { _id: '2', _rev:'1-123', a:2}},
        { id: '3', key: '3', value: { rev:'1-123'}, doc: { _id: '3', _rev:'1-123', a:3}},
      ]
    };
    var mocks = nock(SERVER)
      .get('/mydb/_all_docs?skip=100&limit=100&include_docs=true').reply(200, reply);
    return nosql.all({ skip:100, limit:200}).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should select documents', function() {
    var reply = {
      docs: [
         { _id: '1', _rev:'1-123', a:1, collection:'dogs'},
         { _id: '2', _rev:'1-123', a:2, collection:'dogs'},
         { _id: '3', _rev:'1-123', a:3, collection:'dogs'},
      ]
    };
    var mocks = nock(SERVER)
      .post('/mydb/_find',{ selector: { collection:'dogs'}}).reply(200, reply);

    return nosql.query({collection:'dogs'}).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should sort selected documents', function() {
    var reply = {
      docs: [
         { _id: '1', _rev:'1-123', a:1, collection:'dogs', name:'a'},
         { _id: '2', _rev:'1-123', a:2, collection:'dogs', name:'b'},
         { _id: '3', _rev:'1-123', a:3, collection:'dogs', name:'c'},
      ]
    };
    var mocks = nock(SERVER)
      .post('/mydb/_find',{ selector: { collection:'dogs'}, sort:[{'name:string':'asc'}]}).reply(200, reply);

    return nosql.query({collection:'dogs'},'name').then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '1');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '1');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should sort with CQ object', function() {
    var reply = {
      docs: [
         { _id: '3', _rev:'1-123', a:3, collection:'dogs', name:'c'},
         { _id: '2', _rev:'1-123', a:2, collection:'dogs', name:'b'},
         { _id: '1', _rev:'1-123', a:1, collection:'dogs', name:'a'},
      ]
    };
    var mocks = nock(SERVER)
      .post('/mydb/_find',{ selector: { collection:'dogs'}, sort:[{'name:string':'desc'}]}).reply(200, reply);

    return nosql.query({collection:'dogs'}, [{'name:string':'desc'}]).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '3');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, 3);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should page with sorting', function() {
    var reply = {
      docs: [
         { _id: '100', _rev:'1-123', a:100, collection:'dogs', name:'a'},
         { _id: '101', _rev:'1-123', a:101, collection:'dogs', name:'b'},
         { _id: '102', _rev:'1-123', a:102, collection:'dogs', name:'c'},
      ]
    };
    var mocks = nock(SERVER)
      .post('/mydb/_find',{ selector: { collection:'dogs'}, sort:[{'name:string':'asc'}], skip:100}).reply(200, reply);

    return nosql.query({collection:'dogs'},'name', 100).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '100');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '100');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should page without sorting', function() {
    var reply = {
      docs: [
         { _id: '100', _rev:'1-123', a:100, collection:'dogs', name:'a'},
         { _id: '101', _rev:'1-123', a:101, collection:'dogs', name:'b'},
         { _id: '102', _rev:'1-123', a:102, collection:'dogs', name:'c'},
      ]
    };
    var mocks = nock(SERVER)
      .post('/mydb/_find',{ selector: { collection:'dogs'}, skip:100}).reply(200, reply);

    return nosql.query({collection:'dogs'}, null, 100).then(function(data) {
      assert.equal(data.length, 3);
      assert.equal(typeof data[0], 'object');
      assert.equal(data[0]._id, '100');
      assert.equal(typeof data[0]._rev, 'undefined');
      assert.equal(data[0].a, '100');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('query - should return nothing for no query', function() {
    var reply = [];

    return nosql.query().then(function(data) {
      assert.equal(data.length, 0);
    }).catch(function(err) {
      assert(false);
    });
  });

  it('insert - should add a document', function() {
    var mocks = nock(SERVER)
      .post('/mydb').reply(200, {ok:true, id:'mydoc', rev: '1-123' });

    return nosql.insert({_id:'mydoc', a:1}).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data._id, 'mydoc');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('insert - should add a multiple documents', function() {
    var mocks = nock(SERVER)
      .post('/mydb/_bulk_docs').reply(200, [{ok:true, id:'mydoc1', rev: '1-123' }, {ok:false, id:'mydoc2',err:'conflict' }]);

    return nosql.insert([{_id:'mydoc1', a:1},{_id:'mydoc2', a:1}]).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data.success, 1);
      assert.equal(data.failed, 1);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('insert - should fail gracefully', function() {
    var mocks = nock(SERVER)
      .post('/mydb/_bulk_docs').reply(500, []);

    return nosql.insert([{_id:'mydoc1', a:1},{_id:'mydoc2', a:1}]).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data.success, 0);
      assert.equal(data.failed, 2);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('insert - should add a many documents', function() {
    var docs = [];
    for(var i = 0; i<750; i++) {
      var obj = {_id:i.toString(), a:i};
      docs.push(obj);
    }
    var firstreply = [];
    for(var i = 0; i<500; i++) {
      var obj = {ok:true, id:i.toString(), rev:'1-123'};
      firstreply.push(obj);
    }
    var secondreply = [];
    for(var i = 0; i<250; i++) {
      var obj = {ok:true, id:i.toString(), rev:'1-123'};
      secondreply.push(obj);
    }
    var mocks = nock(SERVER)
      .post('/mydb/_bulk_docs').reply(200, firstreply)
      .post('/mydb/_bulk_docs').reply(200, secondreply);

    return nosql.insert(docs).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data.success, 750);
      assert.equal(data.failed, 0);
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('update - should update a document', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = {  a:2, b:3, _rev: '1-123', _id: 'myddoc'};
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb').reply(200, {ok: true, id: thedoc._id, rev: '2-123'});

    return nosql.update(thedoc._id, {a:2, b:2}).then(function(data) {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('update - should update a document with single param', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = {  a:2, b:3, _rev: '1-123', _id: 'myddoc'};
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb').reply(200, {ok: true, id: thedoc._id, rev: '2-123'});

    return nosql.upsert(thedoc2).then(function(data) {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('del - should delete a document', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc._rev).reply(200, {ok: true, id: thedoc._id, rev: '2-123'});

    return nosql.del(thedoc._id).then(function(data) {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('count - should count all documents', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/fc6b1f69427a0b83fb8317752a1e386a7c03c40b').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/fc6b1f69427a0b83fb8317752a1e386a7c03c40b', rev:'1-123'})
      .get('/mydb/_design/fc6b1f69427a0b83fb8317752a1e386a7c03c40b/_view/fc6b1f69427a0b83fb8317752a1e386a7c03c40b?group=true').reply(200, {rows:[{key:null, value:5}]});

    return nosql.count().then(function(data) {
      assert.equal(data[0].value, 5)
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('count - should count by field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/1b3d038aaaefc68c1425898e8f478ee7fedefec4').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/1b3d038aaaefc68c1425898e8f478ee7fedefec4', rev:'1-123'})
      .get('/mydb/_design/1b3d038aaaefc68c1425898e8f478ee7fedefec4/_view/1b3d038aaaefc68c1425898e8f478ee7fedefec4?group=true').reply(200, {rows:[{key:'black', value:5}]});

    return nosql.count('colour').then(function(data) {
      assert.equal(data[0].value, 5);
      assert.equal(data[0].key, 'black');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

 it('sum - should calculate sum for a field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/cd458dd29b26234e54f194e3e41db2534f51865c').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/cd458dd29b26234e54f194e3e41db2534f51865c', rev:'1-123'})
      .get('/mydb/_design/cd458dd29b26234e54f194e3e41db2534f51865c/_view/cd458dd29b26234e54f194e3e41db2534f51865c?group=true').reply(200, {rows:[{key:null, value:{} }]});

    return nosql.sum('price').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('sum - should calculate sum for an array of fields', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/a6fb25602f3f204652a75618e9199b3052bbc2c1').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/a6fb25602f3f204652a75618e9199b3052bbc2c1', rev:'1-123'})
      .get('/mydb/_design/a6fb25602f3f204652a75618e9199b3052bbc2c1/_view/a6fb25602f3f204652a75618e9199b3052bbc2c1?group=true').reply(200, {rows:[{key:null, value:[{},{}] }]});

    return nosql.sum(['price','age']).then(function(data) {
      assert.equal(data[0].value.length, 2);
      assert.equal(typeof data[0].value[0], 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('sum - should calculate stats for a field grouped by an array of values', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/76a86ee8e58e7ab9ab745ef0a1bdb1ab62a808fe').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/76a86ee8e58e7ab9ab745ef0a1bdb1ab62a808fe', rev:'1-123'})
      .get('/mydb/_design/76a86ee8e58e7ab9ab745ef0a1bdb1ab62a808fe/_view/76a86ee8e58e7ab9ab745ef0a1bdb1ab62a808fe?group=true').reply(200, {rows:[{key:['dog','black'], value:{} }]});

    return nosql.sum('price', ['collection', 'colour']).then(function(data) {
      assert.equal(data[0].key.length, 2);
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('sum - should calculate stats for a field grouped by another field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/a482fa944944d66df6e520ef63146052f4b93438').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/a482fa944944d66df6e520ef63146052f4b93438', rev:'1-123'})
      .get('/mydb/_design/a482fa944944d66df6e520ef63146052f4b93438/_view/a482fa944944d66df6e520ef63146052f4b93438?group=true').reply(200, {rows:[{key:'black', value:{} }]});

    return nosql.sum('price', 'colour').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('sum - with missing value field should throw error', function() {


    assert.throws(nosql.sum, Error, 'Missing "val" parameter');
  });

  it('stats - should calculate stats for a field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/55e12c8b9c4372e1aa7f054c5c0f66ce6a80a40d').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/55e12c8b9c4372e1aa7f054c5c0f66ce6a80a40d', rev:'1-123'})
      .get('/mydb/_design/55e12c8b9c4372e1aa7f054c5c0f66ce6a80a40d/_view/55e12c8b9c4372e1aa7f054c5c0f66ce6a80a40d?group=true').reply(200, {rows:[{key:null, value:{} }]});

    return nosql.stats('price').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('stats - should calculate stats for an array of fields', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/5f8d70fc8a2780bb4cab82fa9f82caa16d6f6725').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/5f8d70fc8a2780bb4cab82fa9f82caa16d6f6725', rev:'1-123'})
      .get('/mydb/_design/5f8d70fc8a2780bb4cab82fa9f82caa16d6f6725/_view/5f8d70fc8a2780bb4cab82fa9f82caa16d6f6725?group=true').reply(200, {rows:[{key:null, value:[{},{}] }]});

    return nosql.stats(['price','age']).then(function(data) {
      assert.equal(data[0].value.length, 2);
      assert.equal(typeof data[0].value[0], 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('stats - should calculate stats for a field grouped by an array of values', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/4cc8d01bea7c0b76ceebd8fb63d88b8021232d46').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/4cc8d01bea7c0b76ceebd8fb63d88b8021232d46', rev:'1-123'})
      .get('/mydb/_design/4cc8d01bea7c0b76ceebd8fb63d88b8021232d46/_view/4cc8d01bea7c0b76ceebd8fb63d88b8021232d46?group=true').reply(200, {rows:[{key:['dog','black'], value:{} }]});

    return nosql.stats('price', ['collection', 'colour']).then(function(data) {
      assert.equal(data[0].key.length, 2);
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('stats - should calculate stats for a field grouped by another field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/2910d31d6d3d1da4c2b5913ee55c8ef2ccde9764').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/2910d31d6d3d1da4c2b5913ee55c8ef2ccde9764', rev:'1-123'})
      .get('/mydb/_design/2910d31d6d3d1da4c2b5913ee55c8ef2ccde9764/_view/2910d31d6d3d1da4c2b5913ee55c8ef2ccde9764?group=true').reply(200, {rows:[{key:'black', value:{} }]});

    return nosql.stats('price', 'colour').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('stats - with missing value field should throw error', function() {

    assert.throws(nosql.stats, Error, 'Missing "val" parameter');
  });
});