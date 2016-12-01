var assert = require('assert');
var ddoc = require('../lib/ddoc.js');
var SERVER = 'https://myaccount.cloudant.com';
var url = SERVER + '/mydb';
var nock = require('nock');

describe('ddoc', function() {

  it('should be function', function() {
    assert(typeof ddoc, 'function');
  });

  it('should return an object with a get function', function() {
    var d = ddoc({});
    assert(typeof d.get, 'function');
  });

  it('should return a pre-existing design document', function() {
    var thedoc = { _id: '_design/myddoc', _rev: '1-123', a:1, b:2 };
    var mocks = nock(SERVER)
      .get('/mydb/' + thedoc._id).reply(200, thedoc);
    var d = ddoc(url);
    return d.get(thedoc._id).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.deepEqual(data, thedoc);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });

  it('should return a blank design document on 404', function() {
    var reply = { ok:false, err:'not_found', reason:'missing'};
    var id = '_design/myid';
    var mocks = nock(SERVER)
      .get('/mydb/' + id).reply(404, reply);
    var d = ddoc(url);
    return d.get(id).then(function(data) {
      assert.equal(typeof data, 'object');
      assert.equal(data._id, id);
      assert.equal(typeof data.views, 'object');
      assert.equal(Object.keys(data.views).length, 0);
      assert(mocks.isDone());
    }).catch(function(err) {
      assert(false);
    });
  });



});