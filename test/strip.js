var assert = require('assert');
var strip = require('../lib/strip.js');

describe('strip', function() {

  it('should expose two functions', function() {
    assert(typeof strip.singleDoc, 'function');
    assert(typeof strip.arrayOfDocs, 'function');
  });

  it('should handle null', function() {
    var doc = null;
    var d = strip.singleDoc(doc);
    assert.equal(doc, null);
  });

  it('should strip _rev', function() {
    var doc = { _id:'a', _rev: 'b', property:'c'};
    var d = strip.singleDoc(doc);
    assert(typeof d._rev, 'undefined');
    assert.equal(d._id, 'a');
    assert.equal(d.property, 'c');
  });

  it('should strip rev', function() {
    var doc = { _id:'a', rev: 'b', property:'c'};
    var d = strip.singleDoc(doc);
    assert(typeof d.rev, 'undefined');
    assert.equal(d._id, 'a');
    assert.equal(d.property, 'c');
  });

  it('should move _id to id', function() {
    var doc = { id:'a', property:'c'};
    var d = strip.singleDoc(doc);
    assert(typeof d.id, 'undefined');
    assert.equal(d._id, 'a');
    assert.equal(d.property, 'c');
  });

  it('should strip multiple docs', function() {
    var docs = [
      { id:'a', rev: 'b', property:'c'},
      { id:'x', rev: 'y', property:'z'}
    ];
    var d = strip.arrayOfDocs(docs);
    assert(typeof d[0].rev, 'undefined');
    assert.equal(d[0]._id, 'a');
    assert.equal(d[0].property, 'c');
    assert(typeof d[1].rev, 'undefined');
    assert.equal(d[1]._id, 'x');
    assert.equal(d[1].property, 'z');
  });
});