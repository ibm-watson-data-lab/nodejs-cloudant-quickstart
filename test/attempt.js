var assert = require('assert');
var attempt = require('../lib/attempt.js');
var SERVER = 'https://myaccount.cloudant.com';
var db = SERVER + '/mydb';
var nock = require('nock');

describe('attempt', function() {

  it('should be an object', function() {
    assert(typeof attempt, 'object');
  });

  it('should have three functions', function() {
    assert(typeof attempt.del, 'function');
    assert(typeof attempt.update, 'function');
    assert(typeof attempt.insert, 'function');
  });

  it('should delete a document at the first attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc._rev).reply(200, {ok: true, id: thedoc._id, rev: '2-123'});
    return attempt.del(db, thedoc._id).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should delete a document at the second attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc._rev).reply(409, {ok: false, err:'failed', reason:'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc2._rev).reply(200, {ok: true, id: thedoc._id, rev: '3-678'});
    return attempt.del(db, thedoc._id).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should delete a document at the third attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var thedoc3 = { _id: 'myddoc', _rev: '3-678', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc._rev).reply(409, {ok: false, err:'failed', reason:'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc2._rev).reply(409, {ok: false, err:'failed', reason:'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc3)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc3._rev).reply(200, {ok: true, id: thedoc._id, rev: '4-91011'});
    return attempt.del(db, thedoc._id).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should fail after a third failed attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var thedoc3 = { _id: 'myddoc', _rev: '3-678', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc._rev).reply(409, {ok: false, err:'failed', reason:'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc2._rev).reply(409, {ok: false, err:'failed', reason:'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc3)
      .delete('/mydb/' + thedoc._id + '?rev=' + thedoc3._rev).reply(409, {ok: false, err:'failed', reason:'conflict'});
    return attempt.del(db, thedoc._id).then(function(data) {
      assert(false);
    }).catch(function(err) {
      assert.equal(err.statusCode, 409);
      assert(mocks.isDone());
    }) ;
  });

  it('should fail to delete a non-existant doc', function() {
    var id = 'myid';
    var mocks = nock(SERVER)
      .get('/mydb/' + id).reply(404, { ok: false, err: 'failed', reason:'missing'})
      .get('/mydb/' + id).reply(404, { ok: false, err: 'failed', reason:'missing'})
      .get('/mydb/' + id).reply(404, { ok: false, err: 'failed', reason:'missing'});
    return attempt.del(db, id).then(function(data) {
      assert(false);
    }).catch(function(err) {
      assert.equal(err.statusCode, 404);
      assert(mocks.isDone());
    }) ;
  });

  it('should update a document at the first attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var theupdate = { a:1, b:3 };
    var theupdatewithrev = { _id: 'myddoc', _rev: '1-123', a:1, b:3 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb',  theupdatewithrev).reply(200, {ok: true, id: thedoc._id, rev: '2-123'});
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should update a non-existant doc', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var theupdate = { _id: 'myddoc', a:1, b:3 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(404, {ok:false, err:'not_found', reason:'missing'})
      .post('/mydb',  theupdate).reply(200, {ok: true, id: thedoc._id, rev: '1-123'});
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should not bother updating an identical doc', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var theupdate = { a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc);
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should update a document at the second attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var theupdate = {a:1, b:3, _rev: '1-123'};
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb',  theupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .post('/mydb', theupdate).reply(200, {ok: true, id: thedoc._id, rev: '3-91011'});
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should update a document at the third attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var thedoc3 = { _id: 'myddoc', _rev: '3-678', a:1, b:2 };
    var firstupdate = {a:1, b:3, _id: 'myddoc', _rev: '1-123'};
    var secondupdate = {a:1, b:3, _id: 'myddoc', _rev: '2-456'};
    var thirdupdate = {a:1, b:3, _id: 'myddoc', _rev: '3-678'};
    var theupdate = {a:1, b:3};
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb',  firstupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .post('/mydb',  secondupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc3)
      .post('/mydb', thirdupdate).reply(200, {ok: true, id: thedoc._id, rev: '4-91011'});
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should fail after a failed third attempt', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var thedoc2 = { _id: 'myddoc', _rev: '2-456', a:1, b:2 };
    var thedoc3 = { _id: 'myddoc', _rev: '3-678', a:1, b:2 };
    var firstupdate = {a:1, b:3, _id: 'myddoc', _rev: '1-123'};
    var secondupdate = {a:1, b:3, _id: 'myddoc', _rev: '2-456'};
    var thirdupdate = {a:1, b:3, _id: 'myddoc', _rev: '3-678'};
    var theupdate = {a:1, b:3};
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb',  firstupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc2)
      .post('/mydb',  secondupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'})
      .get('/mydb/' + thedoc._id).reply(200, thedoc3)
      .post('/mydb', thirdupdate).reply(409, {ok: false, err: 'failed',reason: 'conflict'});
    return attempt.update(db, thedoc._id, theupdate).then(function(data) {
      assert(false);
    }).catch(function(err) {
      assert(mocks.isDone());
    });
  });

  it('should merge in new keys with merge=true', function() {
    var thedoc = { _id: 'myddoc', _rev: '1-123', a:1, b:2 };
    var theupdate = { c:3 };
    var theupdatewithrev = { _id: 'myddoc', _rev: '1-123', a:1, b:2, c:3 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc)
      .post('/mydb',  theupdatewithrev).reply(200, {ok: true, id: thedoc._id, rev: '2-123'});
    return attempt.update(db, thedoc._id, theupdate, true).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should do a simple insert', function() {
    var id = 'myddoc';
    var thedoc = { a:1, b:2 };
    var theupdatewithrev = { _id: 'myddoc', _rev: '1-123', a:1, b:2, c:3 };
    var mocks = nock(SERVER)
      .put('/mydb/' + id, thedoc).reply(200, {ok: true, id: theupdatewithrev._id, rev: theupdatewithrev._rev});
    return attempt.insert(db, id, thedoc).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should insert a document at the second attempt', function() {
    var id = 'myddoc';
    var thedoc = { a:1, b:2 };
    var theupdatewithrev = { _id: 'myddoc', _rev: '1-123', a:1, b:2, c:3 };
    var mocks = nock(SERVER)
      .put('/mydb/' + id, thedoc).reply(429, {ok: false, err:'too many calls', reason:'api'})
      .put('/mydb/' + id, thedoc).reply(200, {ok: true, id: theupdatewithrev._id, rev: theupdatewithrev._rev});
    return attempt.insert(db, id, thedoc).then(function(data) {
      assert(mocks.isDone());
    });
  });

  it('should insert a document at the third attempt', function() {
    var id = 'myddoc';
    var thedoc = { a:1, b:2 };
    var theupdatewithrev = { _id: 'myddoc', _rev: '1-123', a:1, b:2, c:3 };
    var mocks = nock(SERVER)
      .put('/mydb/' + id, thedoc).reply(429, {ok: false, err:'too many calls', reason:'api'})
      .put('/mydb/' + id, thedoc).reply(429, {ok: false, err:'too many calls', reason:'api'})
      .put('/mydb/' + id, thedoc).reply(200, {ok: true, id: theupdatewithrev._id, rev: theupdatewithrev._rev});
    return attempt.insert(db, id, thedoc).then(function(data) {
      assert(mocks.isDone());
    });
  });

});