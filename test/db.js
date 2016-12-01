var assert = require('assert');
var db = require('../lib/db.js');
var SERVER = 'https://myaccount.cloudant.com';
var nock = require('nock');

describe('db', function() {

  it('should be a function', function() {
    assert(typeof db, 'function');
  });

  it('should return an object', function() {
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var d = db(cloudant);
    assert(typeof db, 'object');
  });

  it('should have the requisite functions', function() {
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var d = db(cloudant);
    assert(typeof d.create, 'function');
    assert(typeof d.info, 'function');
    assert(typeof d.list, 'function');
    assert(typeof d.query, 'function');
    assert(typeof d.insert, 'function');
    assert(typeof d.update, 'function');
    assert(typeof d.upsert, 'function');
    assert(typeof d.get, 'function');
    assert(typeof d.del, 'function');
    assert(typeof d.delete, 'function');
    assert(typeof d.count, 'function');
    assert(typeof d.stats, 'function');                    
  });

  it('list - should get databases without _users & _replicator', function() {
    var mocks = nock(SERVER)
      .get('/_all_dbs').reply(200, ['_users','_replicator','a','b','c']);
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql().list().then(function(data) {
      assert.deepEqual(data, ['a','b','c']);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('create - should create a database with indexes where db did not exist', function() {
    var mocks = nock(SERVER)
      .put('/mydb').reply(200, {ok:true})
      .post('/mydb/_index', { type: 'text', index: {}}).reply(200, {result: 'created'});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').create().then(function() {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('create - should fail when db exists', function() {
    var mocks = nock(SERVER)
      .put('/mydb').reply(412, {ok:false, err:'failed', reason:'exists'});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').create().then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').info().then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').get('1').then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').get(['1','2']).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').get(['1','2']).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').all().then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').all({limit:3}).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').all({ skip:100, limit:200}).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query({collection:'dogs'}).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query({collection:'dogs'},'name').then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query({collection:'dogs'}, [{'name:string':'desc'}]).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query({collection:'dogs'},'name', 100).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query({collection:'dogs'}, null, 100).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').query().then(function(data) {
      assert.equal(data.length, 0);
    }).catch(function(err) {
      assert(false);
    });
  });

  it('insert - should add a document', function() {
    var mocks = nock(SERVER)
      .post('/mydb').reply(200, {ok:true, id:'mydoc', rev: '1-123' });
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').insert({_id:'mydoc', a:1}).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').insert([{_id:'mydoc1', a:1},{_id:'mydoc2', a:1}]).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').insert([{_id:'mydoc1', a:1},{_id:'mydoc2', a:1}]).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').insert(docs).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').update(thedoc._id, {a:2, b:2}).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').upsert(thedoc2).then(function(data) {
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
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').del(thedoc._id).then(function(data) {
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('count - should count all documents', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/d44da22510de9a5eb7275b61a4beebd4d0cd6b5d').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/d44da22510de9a5eb7275b61a4beebd4d0cd6b5d', rev:'1-123'})
      .get('/mydb/_design/d44da22510de9a5eb7275b61a4beebd4d0cd6b5d/_view/d44da22510de9a5eb7275b61a4beebd4d0cd6b5d?group=true').reply(200, {rows:[{key:null, value:5}]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').count().then(function(data) {
      assert.equal(data[0].value, 5)
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('count - should count by field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/393e545a0127f9f985a899338a5b4816f2cd1da1').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/393e545a0127f9f985a899338a5b4816f2cd1da1', rev:'1-123'})
      .get('/mydb/_design/393e545a0127f9f985a899338a5b4816f2cd1da1/_view/393e545a0127f9f985a899338a5b4816f2cd1da1?group=true').reply(200, {rows:[{key:'black', value:5}]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').count('colour').then(function(data) {
      assert.equal(data[0].value, 5);
      assert.equal(data[0].key, 'black');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('stats - should calculate stats for a field', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/3e4bfe1dc808b5c85d4b288a11e77ba47c5bb486').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/3e4bfe1dc808b5c85d4b288a11e77ba47c5bb486', rev:'1-123'})
      .get('/mydb/_design/3e4bfe1dc808b5c85d4b288a11e77ba47c5bb486/_view/3e4bfe1dc808b5c85d4b288a11e77ba47c5bb486?group=true').reply(200, {rows:[{key:null, value:{} }]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').stats('price').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('stats - should calculate stats for an array of fields', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/65232a576ff921242b86c07186aa066311df41bf').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/65232a576ff921242b86c07186aa066311df41bf', rev:'1-123'})
      .get('/mydb/_design/65232a576ff921242b86c07186aa066311df41bf/_view/65232a576ff921242b86c07186aa066311df41bf?group=true').reply(200, {rows:[{key:null, value:[{},{}] }]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').stats(['price','age']).then(function(data) {
      assert.equal(data[0].value.length, 2);
      assert.equal(typeof data[0].value[0], 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      console.log(err);
      assert(false);
    });
  });

  it('stats - should calculate stats for a filed grouped by an array of values', function() {
    var mocks = nock(SERVER)
      .get('/mydb/_design/fb9faa104e3cfd4ebe15d9e76734954fdd70c0c0').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/fb9faa104e3cfd4ebe15d9e76734954fdd70c0c0', rev:'1-123'})
      .get('/mydb/_design/fb9faa104e3cfd4ebe15d9e76734954fdd70c0c0/_view/fb9faa104e3cfd4ebe15d9e76734954fdd70c0c0?group=true').reply(200, {rows:[{key:['dog','black'], value:{} }]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').stats('price', ['collection', 'colour']).then(function(data) {
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
      .get('/mydb/_design/e9bf00f989ca3fab2b6992ec0cc69af6070a05b2').reply(404, {ok: false, err: 'not_found',reason:'missing'})
      .post('/mydb').reply(200, {ok:true, id:'_design/e9bf00f989ca3fab2b6992ec0cc69af6070a05b2', rev:'1-123'})
      .get('/mydb/_design/e9bf00f989ca3fab2b6992ec0cc69af6070a05b2/_view/e9bf00f989ca3fab2b6992ec0cc69af6070a05b2?group=true').reply(200, {rows:[{key:'black', value:{} }]});
    var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    return nosql('mydb').stats('price', 'colour').then(function(data) {
      assert.equal(typeof data[0].value, 'object');
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('stats - with missing value field should throw error', function() {
      var cloudant = require('cloudant')( {url : SERVER, plugin: 'promises'});
    var nosql = db(cloudant);
    assert.throws(nosql('mydb').stats, Error, 'Missing "val" parameter');
  });


});