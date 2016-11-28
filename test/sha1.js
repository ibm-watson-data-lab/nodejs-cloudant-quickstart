var assert = require('assert');
var sha1 = require('../lib/sha1.js');

describe('sha1', function() {

  it('should expose one function', function() {
    assert(typeof sha1, 'function');
  });

  it('should hash properly', function() {
      assert.equal(sha1('monkey'), 'ab87d24bdc7452e55738deb5f868e1f16dea5ace');
  });

  it('should return null for everything else', function() {
      assert.equal(sha1({}), null);
      assert.equal(sha1(true), null);
      assert.equal(sha1(1), null);
      assert.equal(sha1(), null);
      assert.equal(sha1(null), null);
  });

});