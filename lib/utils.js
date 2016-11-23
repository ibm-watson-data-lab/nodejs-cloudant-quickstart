var strip = require('./strip.js');

var isArray = function(v) {
  return (v && v.constructor === Array);
};

var formatOutput = function(data) {
  if (isArray(data)) {
    return strip.arrayOfDocs(data);
  } else if (isArray(data.docs)) {
    return strip.arrayOfDocs(data.docs);
  } else {
    return strip.singleDoc(data);
  }
};

module.exports = {
  isArray: isArray,
  formatOutput: formatOutput
};