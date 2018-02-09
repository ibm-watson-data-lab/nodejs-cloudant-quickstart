var arrayOfDocs = function (docs) {
  return docs.map(singleDoc)
}

var singleDoc = function (doc) {
  if (doc && typeof doc === 'object') {
    if (doc.id) {
      doc._id = doc.id
      delete doc.id
    }
    delete doc._rev
    delete doc.rev
  }
  return doc
}

module.exports = {
  singleDoc: singleDoc,
  arrayOfDocs: arrayOfDocs
}
