module.exports = function(db) {
 

  // get the design doc or return a blank one
  var get = function(id) {
    return new Promise(function(resolve, reject) {
      db.get(id)
        .then(resolve)
        .catch(function(err) {
          resolve({ _id: id, views:{}})
        });
    });
  };

  return {
    get: get
  }
};