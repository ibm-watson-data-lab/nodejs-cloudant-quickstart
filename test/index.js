
var assert = require('assert');

describe('index', function() {

  it('should detect bad urls', function() {
     assert.throws(function() { require('../index.js')('badurl');}, Error, 'invalid url');
  });

  it('should detect missing database', function() {
     assert.throws(function() { require('../index.js')('http://localhost:5984');}, Error, 'no database name provided');
  });

  it('should work with missing dbname', function() {
    var db = require('../index.js')('http://localhost:5984/mydb')
  });

  it('should work with dbname', function() {
    var db = require('../index.js')('http://localhost:5984', 'mydb');
  });

});