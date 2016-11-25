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

For larger data sets, the document list can be retrieved in blocks of 100:

```js
// return records 300 to 400
animals.all({skip:300})
```

or the list can be queried by passing a query to `query` function:

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

The string can represent an value from deeper within your document:
```js
animals.count('address.postcode').then(console.log);
// [ { key: 'BT', value: 1 },
//  { key: 'NE', value: 3 },
//  { key: 'TS', value: 6 } ]
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

## Stats

To get the stats on your documents, call the `stats` function passing in the field you would like statistics on:

```js
// get stats on an animals' cost
animals.stats('cost').then(console.log);
// [
//   {
//     "key": null,
//     "value": {"sum":7573,"count":10,"min":252,"max":1022,"sumsqr":6368191}
//   }
// ]
```

This also works for an array of fields:

```js
// get stats on animals' cost & weight
animals.stats(['cost','weight']).then(console.log);
// [
//   { 
//     "key": null,
//     "value": [
//       {"sum":7573,"count":10,"min":252,"max":1022,"sumsqr":6368191},
//       {"sum":342.26000000000005,"count":10,"min":4.21,"max":164.21,"sumsqr":34679.994600000005}
//     ]
//   }
// ]
```

The stats can also be grouped by another field by providing a second parameter:

```js
// get stats on animals' cost - grouped by collection
animals.stats('cost', 'collection').then(console.log);
// [
//   {
//     "key": "cats", 
//     "value": {"sum":3866,"count":5,"min":524,"max":1022,"sumsqr":3167598}
//   },
//   {
//     "key":"dogs",
//      "value": {"sum":3707,"count":5,"min":252,"max":992,"sumsqr":3200593}
//   }
// ]
```

Arrays work for grouping too:

```js
// get stats on animals' cost & weight - grouped by collection
nosql('pets').stats(['cost','weight'], 'collection').then(JSON.stringify).then(console.log);
// [
//   {
//     "key": "cats",
//     "value": [
//        {"sum":3866,"count":5,"min":524,"max":1022,"sumsqr":3167598},
//        {"sum":57.43000000000001,"count":5,"min":4.21,"max":36.21,"sumsqr":1429.0722999999998}
//     ]
//    },
//    {
//      "key": "dogs",
//       "value":[
//         {"sum":3707,"count":5,"min":252,"max":992,"sumsqr":3200593},
//         {"sum":284.83000000000004,"count":5,"min":14.21,"max":164.21,"sumsqr":33250.922300000006}
//        ]
//    }
// ]  
```