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
    .collection("dogs")
    .insert({name:"Bobby", colour:"black"})
    .then(function(data) {
      // success
    })
    .catch(function(err) {
      // failure
    });
```

The following code samples omit the Promise `then` and `catch` for brevity, 
but all database operations are asynchronous.

## CRUD operations

### Creating a database

Before a database can be used, it must be created once:

```js
  nosql("animals").create()
```

### Adding documents

A database are sub-divided into collections

```js
  nosql("animals")
    .collection("dogs")
    .insert({ _id: 'dog1', name:"Bobby", colour:"black"})
```

Documents have a key field `_id` which must be unique across the database. It can
either be supplied by you in the object you create or can be omitted and one will be generated for you:

```js
  var dogs = nosql("animals").collection("dogs");

  dogs
    .insert({name:"Sam", colour:"grey"})
    .then(function(data) {
      // {
      //    "ok": true,
      //    "_id": "f03bb0361f1a507d3dc68d0e860675b6"
      //  }
    })
```

We can insert arrays of documents for bulk inserts:

```js
   var somecats = [
     { _id:"cat1", name:"Paws", colour:"tabby"},
     { _id:"cat2", name:"Fluffy", colour:"white"},
     { _id:"cat3", name:"Snowy", colour:"white"}
   ];
   nosql("animals")
     .collection("cats")
     .insert(somecats);
```

### Fetching documents by id

```js
  cats.get("cat1");
```

or by supplying multiple document ids:

```js
  cats.get(["cat1","cat2"]);
```

### Updating documents

A document can be replaced with a new document by supplying its `_id`:

```js
  var id = "dog1";
  var newdoc = {name:"Bobbie", colour:"black"}
  dogs.update(id, newdoc);
```

### Deleting documents

A document can be deleted by supplying its `_id`:

```js
  var id = "dog1";
  var newdoc = {name:"Bobbie", colour:"black"}
  dogs.del(id, newdoc);
```

## Querying a collection

Documents can be retrieved from their collection:

```js
   dogs.all().then(function(data) {
     // [
     //   { "_id": "dog1", "name": "Bobbie", "colour": "black" },
     //   { "_id": "f03bb0361f1a507d3dc68d0e860675b6", "name": "Sam", "colour": "grey" },
     // ]
   });
```

or the list can be filtered by passing a query:

```js
   cats.filter({colour: 'white'}).then(function(data) {
     // [
     //   { _id:"cat2", name:"Fluffy", colour:"white"},
     //   { _id:"cat3", name:"Snowy", colour:"white"},
     // ]
   });
```

The query can be key/value pairs which are AND'd together or it can be a full Cloudant Query Selector object.


