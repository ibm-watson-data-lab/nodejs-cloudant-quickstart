var assert = require('assert');
var utils = require('../lib/utils.js');

describe('utils', function() {

  it('should expose two functions', function() {
    assert(typeof utils.isArray, 'function');
    assert(typeof utils.formatOutput, 'function');
    assert(typeof utils.clone, 'function');
  });

  it('should detect an array', function() {
      assert(utils.isArray([]));
      assert(utils.isArray([1,2,3]));
      assert(utils.isArray(['1','2','3']));
      assert(utils.isArray([{},{},{}]));
      assert(utils.isArray([[],[],[]]));
      assert(utils.isArray([false,false,false]));
  });

  it('should return false for everything else', function() {
      assert.equal(utils.isArray({}), false);
      assert.equal(utils.isArray(true), false);
      assert.equal(utils.isArray(1), false);
      assert.equal(utils.isArray(), false);
      assert.equal(utils.isArray(null), false);
      assert.equal(utils.isArray('oh my'), false);
  });

  it('should format an array of docs', function() {
    var docs = [
      { _id:'a', _rev: 'b', property:'c'},
      { _id:'x', _rev: 'y', property:'z'}
    ];
    var d = utils.formatOutput(docs);
    assert(typeof d[0].rev, 'undefined');
    assert.equal(d[0]._id, 'a');
    assert.equal(d[0].property, 'c');
    assert(typeof d[1].rev, 'undefined');
    assert.equal(d[1]._id, 'x');
    assert.equal(d[1].property, 'z');
  });

  it('should format an object with an array of docs', function() {
    var docs = [
      { _id:'a', _rev: 'b', property:'c'},
      { _id:'x', _rev: 'y', property:'z'}
    ];
    var d = utils.formatOutput({ docs: docs});
    assert(typeof d[0].rev, 'undefined');
    assert.equal(d[0]._id, 'a');
    assert.equal(d[0].property, 'c');
    assert(typeof d[1].rev, 'undefined');
    assert.equal(d[1]._id, 'x');
    assert.equal(d[1].property, 'z');
  });

  it('should format an object with an array of rows with docs inside', function() {
    var rows = [
      { key: 'a', value:{}, doc: { _id:'a', _rev: 'b', property:'c'}},
      { key: 'x', value:{}, doc: { _id:'x', _rev: 'y', property:'z'}},
      { key: 'z', value:{}, doc: null}
    ];
    var d = utils.formatOutput({ rows: rows});
    assert(typeof d[0].rev, 'undefined');
    assert.equal(d[0]._id, 'a');
    assert.equal(d[0].property, 'c');
    assert(typeof d[1].rev, 'undefined');
    assert.equal(d[1]._id, 'x');
    assert.equal(d[1].property, 'z');
  });

  it('should leave a string untouched', function() {
    var d = utils.simplify('dog');
    assert.equal(d, 'dog');
  });

  it('should clone data', function() {
    var d1 = [ { a:1, b:2}, {c: 1, d:3}];
    var d2 = utils.clone(d1);
    assert.deepEqual(d1,d2);
    d1.splice(0,1);
    assert.equal(d1.length, 1);
    assert.equal(d2.length, 2);
  })
});