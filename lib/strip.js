var arrayOfDocs = function(docs) {
  return docs.map(singleDoc);
};

var singleDoc = function(doc) {
  if (typeof doc === 'object') {
    if (doc.id) {
      doc._id = doc.id;
      delete doc.id;
    }
    delete doc._rev;
    delete doc.rev;
    delete doc.ts;
    delete doc.collection;
  }
  return doc;
};

module.exports = {
  singleDoc: singleDoc,
  arrayOfDocs: arrayOfDocs
}