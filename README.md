# simplenosql

An NoSQL store built using Cloudant but hiding some of Cloudant's more advanced features:

- Changes Feeds
- Replication
- Design Documents
- MVCC (revision tokens)
- Attachments

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
nosql("animals").create().then(console.log);
// {ok:true}
```

### Adding documents

Add a document to a database with the `insert` function:

```js
nosql("animals")
  .insert({ _id: 'dog1', name:"Bobby", colour:"black", collection:"dogs"})
  .then(console.log);
// { ok: true, _id: 'dog1' }
```

Documents have a key field `_id` which must be unique across the database. It can
either be supplied by you in the object you create or can be omitted and one will be generated for you:

```js
var animals = nosql("animals");

animals.insert({name:"Sam", colour:"grey", collection:"dogs"}).then(console.log);
// { ok: true, _id: "f03bb0361f1a507d3dc68d0e860675b6" }
```

We can insert arrays of documents for bulk inserts:

```js
var somecats = [
  { _id:"cat1", name:"Paws", colour:"tabby", collection:"cats"},
  { _id:"cat2", name:"Fluffy", colour:"white", collection:"cats"},
  { _id:"cat3", name:"Snowy", colour:"white", collection:"cats"},
  { _id:"cat4", name:"Mittens", colour:"black", collection:"cats"}
];
animals.insert(somecats).then(console.log);
// [ { ok: true, _id: 'cat1' },
//   { ok: true, _id: 'cat2' },
//   { ok: true, _id: 'cat3' },
//   { ok: true, _id: 'cat4' } ]
```

### Fetching documents by id

```js
animals.get("cat1").then(console.log);
// { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats' }
```

or by supplying multiple document ids:

```js
animals.get(["cat1","cat2"]).then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats' },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats' } ]
```

### Updating documents

A document can be replaced with a new document by supplying its `_id`:

```js
var id = "dog1";
var newdoc = {name:"Bobbie", colour:"black", collection:"dogs"};
animals.update(id, newdoc).then(console.log);
// {ok:true}
```

### Deleting documents

A document can be deleted by supplying its `_id`:

```js
var id = "dog1";
animals.del(id).then(console.log);
// {ok:true}
```

## Querying a collection

All documents can be retrieved with the `all` function:

```js
animals.all().then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats' },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats' },
//   { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats' },
//   { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats' },
//   { _id: 'dog1', name: 'Bobbie', colour: 'black', collection: 'dogs' } ]
```

or the list can be queried by passing a query to `all` or the `query` function:

```js
animals.query({colour: 'white'}).then(console.log);
// [ { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats' },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats' } ]
```

The query can be key/value pairs which are AND'd together:

```js
animals.query({colour: 'black', collection:'cats'}).then(console.log);
// [ { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats' } ]
```

 or it can be a full Cloudant Query Selector object.

```js
animals.query({ "$or": [ {name:'Paws'}, {colour:'black'} ]}).then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats' },
//   { _id: 'dog1', name: 'Bobbie', colour: 'black', collection: 'dogs' },
//   { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats' } ]
```

## Aggregating data

### Counting

The number of fields in a database can be obtained with the `count` function:

```js
animals.count().then(console.log);
// [ { key: null, value: 12 } ]
```

Passing a string to `count` returns the number of occurences of that field's value:

```js
animals.count('colour').then(console.log);
// [ { key: 'black', value: 4 },
//  { key: 'brown', value: 1 },
//  { key: 'ginger', value: 1 },
//  { key: 'gold', value: 1 },
//  { key: 'grey', value: 1 },
//  { key: 'white', value: 2 } ]
```

This also works for multi-dimensional counts:

```js
animals.count(['collection','colour']).then(console.log);
// [ { key: [ 'cats', 'black' ], value: 2 },
//   { key: [ 'cats', 'ginger' ], value: 1 },
//   { key: [ 'cats', 'grey' ], value: 1 },
//   { key: [ 'cats', 'white' ], value: 1 },
//   { key: [ 'dogs', 'black' ], value: 2 },
//   { key: [ 'dogs', 'brown' ], value: 1 },
//   { key: [ 'dogs', 'gold' ], value: 1 },
//   { key: [ 'dogs', 'white' ], value: 1 } ]
```