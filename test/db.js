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

  it('into - should get database information', function() {
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

  it('update - should update a document', function() {
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
  })

});