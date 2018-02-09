var strip = require('./strip.js')

var isArray = Array.isArray || function (obj) {
  return obj && toString.call(obj) === '[object Array]'
}

var clone = function (data) {
  return JSON.parse(JSON.stringify(data))
}

var formatOutput = function (data, leaveDesignDocs) {
  if (isArray(data)) {
    return strip.arrayOfDocs(data)
  } else if (isArray(data.docs)) {
    return strip.arrayOfDocs(data.docs)
  } else if (isArray(data.rows)) {
    var docs = []
    data.rows.forEach(function (r) {
      if (r.doc) {
        if (leaveDesignDocs || !r.doc._id.match(/^_/)) {
          docs.push(r.doc)
        }
      }
    })
    return strip.arrayOfDocs(docs)
  } else {
    return strip.singleDoc(data)
  }
}

var enhance = function (doc) {
  // if it's an object (not an array)
  if (doc && typeof doc === 'object' && typeof doc.length === 'undefined') {
    doc.mean = doc.sum / doc.count
    doc.variance = (doc.sumsqr / doc.count) - doc.mean * doc.mean
    doc.stddev = Math.sqrt(doc.variance)
  }
  return doc
}

var objectify = function (d, field) {
  if (field && field.length > 1) {
    // turn it into an object, keyed on each value
    var val = {}
    for (var i = 0; i < field.length; i++) {
      // calculate mean/stddev/variance too
      d.value[i] = enhance(d.value[i])
      val[field[i]] = d.value[i]
    }
    d.value = val
    return d
  } else {
    d.value = enhance(d.value)
  }
  return d
}

var simplify = function (data, field, operation) {
  // [ { key:null, value: 456 }] => 456
  if (isArray(data) && data.length === 1 && data[0].key === null) {
    data[0] = objectify(data[0], field, operation)
    return data[0].value
  }

  // [ { key:'cats', value: 456 }] => {'cats':456}
  if (isArray(data) && data.length >= 1) {
    var retval = {}
    data.forEach(function (d) {
      var k
      if (isArray(d.key)) {
        k = d.key.join('/')
      } else {
        if (typeof d.key === 'string') {
          k = d.key
        } else {
          k = d.key.toString()
        }
      }
      d = objectify(d, field)
      retval[k] = d.value
    })
    return retval
  }

  return data
}

module.exports = {
  isArray: isArray,
  formatOutput: formatOutput,
  simplify: simplify,
  clone: clone
}
