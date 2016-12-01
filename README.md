# simplenosql

[![Build Status](https://travis-ci.org/glynnbird/simplenosql.svg?branch=master)](https://travis-ci.org/glynnbird/simplenosql)

An NoSQL data store built using Cloudant but hiding some of Cloudant's more advanced features:

- Changes Feeds
- Replication
- Design Documents
- MVCC (revision tokens)
- Attachments

The *simplenosql* library concentrates on creating datbases, creating, updating and deleting documents. It also
allows databases to be queried without creating design documents - this includes creating aggregated views of
your data grouped by keys e.g. total sales and profit by year and month.

Get started storing, querying and aggregating your data using *simplenosql*.

## Installation

```sh
npm install --save simplenosql
```

## Using in your application

Start up the library by passing the URL of your Cloudant database:

```js
var url = 'https://username:password@myhost.cloudant.com';
var nosql = require('simplenosql')(url);
```

The URL should allow *admin* access to your Cloudant account. 

This library uses Promises so function calls are of this form:

```js
nosql('animals')
  .<FUNCTION CALL HERE>
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
nosql('animals')
  .create()
  .then(console.log);
// {ok:true}
```

You may have as many databases as you like:

```js
nosql('animals').create().then(function() {
  return nosql('books').create();
}).then(function() {
  // done
})
```

### Adding documents

Add a document to a database with the `insert` function:

```js
var animals = nosql('animals');
animals
  .insert({ _id: 'dog1', name:'Bobby', colour:'black', collection:'dogs', cost:45, weight:6.4})
  .then(console.log);
// { ok: true, _id: 'dog1' }
```

Documents have a key field `_id` which must be unique across the database. It can
either be supplied by you in the object you create or can be omitted and one will be generated for you:

```js
animals
  .insert({name:'Sam', colour:'grey', collection:'dogs', cost:72, weight: 5.2})
  .then(console.log);
// { ok: true, _id: "f03bb0361f1a507d3dc68d0e860675b6" }
```

We can insert arrays of documents for bulk inserts:

```js
var somecats = [
  { _id:'cat1', name:'Paws', colour:'tabby', collection:'cats', cost:102, weight:2.4},
  { _id:'cat2', name:'Fluffy', colour:'white', collection:'cats', cost:82, weight:2.1},
  { _id:'cat3', name:'Snowy', colour:'white', collection:'cats', cost:52, weight:6.0},
  { _id:'cat4', name:'Mittens', colour:'black', collection:'cats', cost:45, weight:1.8}
];
animals
  .insert(somecats)
  .then(console.log);
// { ok: true, success: 4, failed: 0 }
```

Arrays of documents are written 500 at a time with up to 5 write operations going on in parallel.

### Fetching documents by id

```js
animals
  .get('cat1')
  .then(console.log);
// { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 }
```

or by supplying multiple document ids:

```js
animals
  .get(['cat1', 'cat2'])
  .then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 } ]
```

### Updating documents

A document can be replaced with a new document by supplying its `_id`:

```js
var id = 'dog1';
var newdoc = {name:'Bobbie', colour:'black', collection:'dogs', cost:45, weight:6.4};
animals
  .update(id, newdoc)
  .then(console.log);
// {ok:true}
```

Even if the document id doesn't already exist, *simplenosql* will write a new document, so in a sense the `insert`
function is rather like an "upsert" operation: either update and replace the existing document or create a new one.

### Deleting documents

A document can be deleted by supplying its `_id`:

```js
var id = 'dog1';
animals
  .del(id)
  .then(console.log);
// {ok:true}
```

## Fetching al the documents

All documents can be retrieved with the `all` function:

```js
animals
  .all()
  .then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 },
//   { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats', cost:52, weight:6.0 },
//   { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats', cost:45, weight:1.8 },
//   { _id: 'f03bb0361f1a507d3dc68d0e860675b6', name: 'Sam', colour: 'grey', collection: 'dogs', cost:72, weight: 5.2 } ]
```

For larger data sets, the document list can be retrieved in blocks of 100:

```js
// fetch records 300 to 400
animals.all({skip:300})
```

## Querying the database

A database can be queried by passing a query object to `query` function:

```js
animals
  .query({colour: 'white'})
  .then(console.log);
// [ { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats', cost:52, weight:6.0 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 } ]
```

The query can be key/value pairs which are AND'd together:

```js
animals
  .query({colour: 'black', collection:'cats'})
  .then(console.log);
// [ { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats', cost:45, weight:1.8 } ]
```

or it can be a full [Cloudant Query Selector](https://docs.cloudant.com/cloudant_query.html#selector-syntax) object.

```js
animals
  .query({ "$or": [ {name:'Paws'}, {colour:'black'} ]})
  .then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 },
//   { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats', cost:45, weight:1.8 } ]
```

The optional second parameter provides simple sorting when passed a string:

```js
animals.query({colour: 'black'}, 'name')
```

or multi-dimensional sorting with an array of objects:

```js
animals.query({colour: 'black'}, [{'name:string':'desc'},{'cost:number':'desc'}])
```

See [Clouant Query](https://docs.cloudant.com/cloudant_query.html#sort-syntax) documentation for details on the full sort syntax.

The query returns a maximum of 100 documents at a time. The third parameter can be used to page through large result set:

```js
animals.query({colour: 'black'}, 'name', 0)  // first 100 results
animals.query({colour: 'black'}, 'name', 100) // next 100 results
animals.query({colour: 'black'}, null, 500) // paging without sorting
```

## Aggregating data

### Counting

The number of documents in a database can be obtained with the `count` function:

```js
animals
  .count()
  .then(console.log);
// [ { key: null, value: 5 } ]
```

Passing a string to `count` returns the number of occurences of that field's values:

```js
animals
  .count('colour')
  .then(console.log);
// [ { key: 'black', value: 1 },
//  { key: 'grey', value: 1 },
//  { key: 'tabby', value: 1 },
//  { key: 'white', value: 2 } ]
```

Values from deeper within your document can be accessed using object notation:

- `address.postcode`
- `socialmedia.facebook.email`

Passing an array to `count` causes multi-dimensional counting:

```js
animals
  .count(['collection','colour'])
  .then(console.log);
// [ { key: [ 'cats', 'black' ], value: 1 },
//  { key: [ 'cats', 'tabby' ], value: 1 },
//  { key: [ 'cats', 'white' ], value: 2 },
//  { key: [ 'dogs', 'grey' ], value: 1 } ]
```

## Stats

To get the statistics on values from your documents, call the `stats` function passing in the 
field you would like statistics on:

```js
// get stats on an animals' cost
animals
  .stats('cost')
  .then(console.log);
// > [ { key: null,
//    value: { sum: 353, count: 5, min: 45, max: 102, sumsqr: 27041 } } ]
```

This also works for an array of fields:

```js
// get stats on animals' cost & weight
animals
  .stats(['cost','weight'])
  .then(console.log);
// [
//   { 
//     "key":null,
//     "value":[
//        {"sum":353,"count":5,"min":45,"max":102,"sumsqr":27041},
//        {"sum":17.5,"count":5,"min":1.8,"max":6,"sumsqr":76.45}
//     ]
//   }
// ]
```

The stats can also be grouped by another field by providing a second parameter:

```js
// get stats on animals' cost - grouped by collection
animals
  .stats('cost', 'collection')
  .then(console.log);
// [
//   {
//     "key":"cats",
//      "value": {"sum":281,"count":4,"min":45,"max":102,"sumsqr":21857}
//   },
//   {
//     "key":"dogs",
//     "value":{"sum":72,"count":1,"min":72,"max":72,"sumsqr":5184}
//   }
// ]
```

Arrays work for grouping too:

```js
// get stats on animals' cost & weight - grouped by collection
nosql('pets')
  .stats(['cost','weight'], 'collection')
  .then(console.log);
// [
//   {
//     "key":"cats",
//     "value":[
//       {"sum":281,"count":4,"min":45,"max":102,"sumsqr":21857},
//       {"sum":12.3,"count":4,"min":1.8,"max":6,"sumsqr":49.410000000000004}
//     ]
//   },
//   {
//     "key":"dogs",
//     "value":[
//       {"sum":72,"count":1,"min":72,"max":72,"sumsqr":5184},
//       {"sum":5.2,"count":1,"min":5.2,"max":5.2,"sumsqr":27.040000000000003}
//     ]
//   }
// ] 
```
