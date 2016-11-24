# simplenosql

An NoSQL store built using Cloudant but hiding some of Cloudant's more advanced features:

- Changes Feeds
- Replication
- Design Documents
- MVCC (revision tokens)

## Installation

```sh
npm install --save simplenosql
```

## Using in your application

Start up the library by passing the URL of your Cloudant database:

```js
var url = "https://username:password@myhost.cloudant.com";
var nosql = require("simplenosql")(url);
```

This library uses Promises so function calls are of this form:

```js
  nosqldb("animals")
    .insert({name:"Bobby", colour:"black", collection:"dogs"})
    .then(function(data) {
      // success
    })
    .catch(function(err) {
      // failure
    });
```

Some of the following code samples omit the Promise `then` and `catch` for brevity, 
but all database operations are asynchronous.

## CRUD operations

### Creating a database

Before a database can be used, it must be created once:

```js
  nosql("animals").create()
```

### Adding documents

Add a document to a database with the `insert` function:

```js
  nosql("animals")
    .insert({ _id: 'dog1', name:"Bobby", colour:"black", collection:"dogs"})
```

Documents have a key field `_id` which must be unique across the database. It can
either be supplied by you in the object you create or can be omitted and one will be generated for you:

```js
  var animals = nosql("animals");

  animals.insert({name:"Sam", colour:"grey"}).then(function(data) {
    // {
    //    "ok": true,
    //    "_id": "f03bb0361f1a507d3dc68d0e860675b6"
    //  }
  });
```

We can insert arrays of documents for bulk inserts:

```js
   var somecats = [
     { _id:"cat1", name:"Paws", colour:"tabby", collection:"cats"},
     { _id:"cat2", name:"Fluffy", colour:"white", collection:"cats"},
     { _id:"cat3", name:"Snowy", colour:"white", collection:"cats"}
   ];
   animals.insert(somecats);
```

### Fetching documents by id

```js
  animals.get("cat1");
```

or by supplying multiple document ids:

```js
  animals.get(["cat1","cat2"]);
```

### Updating documents

A document can be replaced with a new document by supplying its `_id`:

```js
  var id = "dog1";
  var newdoc = {name:"Bobbie", colour:"black", collection:"dogs"};
  animals.update(id, newdoc);
```

### Deleting documents

A document can be deleted by supplying its `_id`:

```js
  var id = "dog1";
  animals.del(id);
```

## Querying a collection

All documents can be retrieved with the `all` function:

```js
   animals.all().then(function(data) {
     // [
     //   { "_id": "dog1", "name": "Bobbie", "colour": "black", collection:"dogs" },
     //   { "_id": "f03bb0361f1a507d3dc68d0e860675b6", "name": "Sam", "colour": "grey" },
     // ]
   });
```

or the list can be queried by passing a query to `all` or the `query` function:

```js
   animals.query({colour: 'white'}).then(function(data) {
     // [
     //   { _id:"cat2", name:"Fluffy", colour:"white", collection:"cats"},
     //   { _id:"dog6", name:"Patch", colour:"white", collection:"dogs"},
     // ]
   });
```

The query can be key/value pairs which are AND'd together:

```js
   animals.query({colour: 'white', collection:'cats'}).then(function(data) {
     // [
     //   { _id:"cat2", name:"Fluffy", colour:"white", collection:"cats"},
     // ]
   });
```

 or it can be a full Cloudant Query Selector object.

```js
   animals.query({ "$or": [{colour: 'white'}, { collection:'cats'}]).then(function(data) {
     // [
     //   matching documents here
     // ]
   });
```
