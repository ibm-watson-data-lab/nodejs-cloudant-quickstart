var assert = require('assert');
var SERVER = 'https://myaccount.cloudant.com';
var mydb = 'MYDB';
var nock = require('nock');

describe('debug', function() {

  it('should work with debug on', function(done) {
    var reply = { };
    process.env.DEBUG = 'silverlining'
    var mocks = nock(SERVER)
      .get('/' + mydb).reply(200, reply);
    var db = require('../index.js')(SERVER, mydb);
    db.info().then(function() {
      done();
    });
  });

  it('should work with debug off', function(done) {
    var reply = { };
    process.env.DEBUG = ''
    var mocks = nock(SERVER)
      .get('/' + mydb).reply(200, reply);
    var db = require('../index.js')(SERVER, mydb);
    db.info().then(function() {
      done();
    });
  });
});