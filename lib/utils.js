var strip = require('./strip.js');

var isArray = function(v) {
  return (v && v.constructor === Array);
};

var formatOutput = function(data) {
  if (isArray(data)) {
    return strip.arrayOfDocs(data);
  } else if (isArray(data.docs)) {
    return strip.arrayOfDocs(data.docs);
  } else if (isArray(data.rows)) {
    var docs = [];
    data.rows.forEach(function(r) {
      if (r.doc && !r.doc._id.match(/^_/)) {
        docs.push(r.doc);
      }
    });
    return strip.arrayOfDocs(docs); 
  } else {
    return strip.singleDoc(data);
  }
};

module.exports = {
  isArray: isArray,
  formatOutput: formatOutput
};