# simplenosql

[![Build Status](https://travis-ci.org/glynnbird/simplenosql.svg?branch=master)](https://travis-ci.org/glynnbird/simplenosql)

An NoSQL data store built using Cloudant but hiding some of Cloudant's more advanced features:

- Changes Feeds
- Replication
- Design Documents & MapReduce
- MVCC (revision tokens)
- Attachments

This library concentrates on creating datbases and creating, updating & deleting documents. It also
allows the data to be queried and aggregated easily without ever seeing a design document databases.

The format of the data you are returned is simplified: revision tokens are removed and complex aggregate JSON
structures are pared down to a minimum.

Get started storing, querying and aggregating your data using *simplenosql*.

## Installation

```sh
npm install --save simplenosql
```

## Using in your application

Start up the library by passing the URL of your Cloudant database:

```js
var url = 'https://username:password@myhost.cloudant.com';
var animals = require('simplenosql')(url, 'animals');
```

The URL should allow *admin* access to your Cloudant account. 

Alternatively, a single parameter with the URL of the **database** can be supplied:

```js
var url = 'https://username:password@myhost.cloudant.com/animals';
var animals = require('simplenosql')(url);
```

This library uses Promises so function calls made on simplenosql object will be of this form:

```js
animals
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

When the `await` JavaScript operator is supported in Node, it will be possible to use this library like so:

```js
var data = await db.all();
```

## CRUD operations

### Creating a database

Before a database can be used, it must be created once with the `create` function:

```js
animals
  .create()
  .then(console.log);
// {ok:true}
```

This creates the database in Cloudant. If you are just connecting to a database that *simplenosql* created for you
last time, then there is no need for the `create` step.

### Adding documents

Add a single document to a database with the `insert` function:

```js
animals
  .insert({ _id: 'dog1', name:'Bobby', colour:'black', collection:'dogs', cost:45, weight:6.4})
  .then(console.log);
// { ok: true, _id: 'dog1' }
```

Documents have a key field `_id` which must be unique across the database. It can
either be supplied by you in the object you pass in or can be omitted and one will be generated for you:

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

Arrays of documents are written in batches of 500 at a time with up to 5 write operations going on in parallel.

### Fetching documents by id

Retrieve a single document with the `get` function:

```js
animals
  .get('cat1')
  .then(console.log);
// { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 }
```

or by supplying multiple document ids to get an array of documents in reply:

```js
animals
  .get(['cat1', 'cat2'])
  .then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 } ]
```

### Updating documents

A document can be replaced with a new document by supplying its `_id` and the new document body:

```js
var id = 'dog1';
var newdoc = {name:'Bobbie', colour:'black', collection:'dogs', cost:45, weight:6.4};
animals
  .update(id, newdoc)
  .then(console.log);
// {ok:true}
```

or by passing in a single object that contains an `_id` in the new body:

```js
var newdoc = { _id: 'dog1', name:'Bobbie', colour:'black', collection:'dogs', cost:45, weight:6.4};
animals
  .update(newdoc)
  .then(console.log);
// {ok:true}
```

Even if the document id doesn't already exist, *simplenosql* will write a new document, so in a sense the `update`
function is rather like an "upsert" operation: either update and replace the existing document or create a new one. 
For this reason, an `upsert` function also exists that is a synonym of the `update` function.

### Deleting documents

A document can be deleted by supplying its `_id`:

```js
var id = 'dog1';
animals
  .del(id)
  .then(console.log);
// {ok:true}
```

## Fetching all the documents

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

For larger data sets, the document list is retrieved in blocks of 100 and a `skip` option can be supplied to retrieve
documents deeper in the data set:

```js
// fetch records 300 to 400
animals.all({skip:300})
```

## Querying the database

A database can be queried by passing a query object to `query` function:

```js
// get animals that are white
animals
  .query({colour: 'white'})
  .then(console.log);
// [ { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats', cost:52, weight:6.0 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 } ]
```

where query is key/value pairs that match the source documents. The key/value pairs are AND'd together:

```js
// get documents that black in are in the 'cats' collection
animals
  .query({colour: 'black', collection:'cats'})
  .then(console.log);
// [ { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats', cost:45, weight:1.8 } ]
```

or the object can contain [Cloudant Query Selector](https://docs.cloudant.com/cloudant_query.html#selector-syntax) operators:

```js
// get animals that are called Paws or that are black
animals
  .query({ "$or": [ {name:'Paws'}, {colour:'black'} ]})
  .then(console.log);
// [ { _id: 'cat1', name: 'Paws', colour: 'tabby', collection: 'cats', cost:102, weight:2.4 },
//   { _id: 'cat4', name: 'Mittens', colour: 'black', collection: 'cats', cost:45, weight:1.8 } ]
```

The optional second parameter can be used for sorting with a `sort` property:

```js
// retrieve black animals and sort by name, in ascending order
animals.query({colour: 'black'}, { sort: {'name:string':'asc'}})
```

or multi-dimensional sorting with an array of objects:

```js
// get animals that are black, sorted by name and cost in reverse order
animals.query({colour: 'black'}, {sort: [{'name:string':'desc'},{'cost:number':'desc'}]} );
```

See [Clouant Query](https://docs.cloudant.com/cloudant_query.html#sort-syntax) documentation for details on the full sort syntax.

The optional second parameter is an object that can contain one or more of:

- sort - an array of sort parameters e.g. `[{'name:string':'desc'},{'cost:number':'desc'}]`
- limit - the number of search results to return. Defaults to 100
- skip - the number of results to skip in the result set. Defaults to 0
- fields - either a string representing the document property to return or an array of properties e.g. `['name','cost','collection']`. If omitted, the whole document is returned. 

e.g.

```js
// animal names, 100 to 200
animals.query({colour: 'black'}, { fields: 'name', skip: 100});
// name and cost of cats sorted by price - highest first
animals.query({collection: 'cats'}, { fields: ['name','cost'], sort: { 'cost:number': 'desc'}});
```

## Aggregating data

### Counting

The number of documents in a database can be obtained with the `count` function:

```js
animals
  .count()
  .then(console.log);
// 5
```

Passing a string to `count` returns the number of occurences of that field's values:

```js
// get counts of animals by colour
animals
  .count('colour')
  .then(console.log);
// { black: 1, grey: 1, tabby: 1, white: 2 }
```

Values from deeper within your document can be accessed using object notation:

- `address.postcode`
- `socialmedia.facebook.email`

Passing an array to `count` causes multi-dimensional counting:

```js
// get counts of animals, grouped by colleciton and colour
animals
  .count(['collection','colour'])
  .then(console.log);
// { 'cats/black': 1,
//   'cats/tabby': 1,
//   'cats/white': 2,
//   'dogs/grey': 1 }
```

### Summing

To get totals of values from your documents call the `sum` function passing in the field you would
like to aggregate:

```js
// get totals on an animals' cost
animals
  .sum('cost')
  .then(console.log);
// 353
```

The sum of multiple properties can be calculated by passing an array of strings:

```js
// get stats on animals' cost & weight
animals
  .sum(['cost','weight'])
  .then(console.log);
// { cost: 353, weight: 17.5 }
```

The totals can also be grouped by another field by providing a second parameter:

```js
// get sum of animals' cost, grouped by collection
animals
  .sum('cost', 'collection')
  .then(console.log);
// { cats: 281, dogs: 72 }

// get sum of animals' cost & weight, grouped by collection
animals
  .sum(['cost','weight'],'collection')
  .then(console.log);
// { 
//   cats: { cost: 281, weight: 12.3 },
//   dogs: { cost: 72, weight: 5.2 } 
// }
```

### Stats

To get the statistics on values from your documents, call the `stats` function passing in the 
field you would like statistics on:

```js
// get stats on an animals' cost
animals
  .stats('cost')
  .then(console.log);
// { sum: 353, count: 5, min: 45, max: 102, mean: 70.6, variance: 423.840, stddev: 20.587 }
```

Multiple values can be analysed using an array of fields:

```js
// get stats on animals' cost & weight
animals
  .stats(['cost','weight'])
  .then(console.log);
// { 
//   cost:  { sum: 353, count: 5, min: 45,max: 102, mean: 70.6, variance: 423.840, stddev: 20.587 }
//   weight:  { sum: 17.5, count: 5, min: 1.8, max: 6, mean: 3.5, variance: 3.040, stddev: 1.7435 } 
// }
```

The stats can also be grouped by another field by providing a second parameter:

```js
// get stats on animals' cost - grouped by collection
animals
  .stats('cost', 'collection')
  .then(console.log);
// { 
//   cats: { sum: 281, count: 4, min: 45, max: 102, mean: 70.25, variance: 529.1875, stddev: 23.004 },
//   dogs: { sum: 72, count: 1,  min: 72, max: 72, mean: 72, variance: 0, stddev: 0 } 
// }
```

Arrays work for grouping too:

```js
// get stats on animals' cost & weight - grouped by collection
animals
  .stats(['cost','weight'], 'collection')
  .then(console.log);
// { 
//   cats: {
//     cost: { sum: 281, count: 4, min: 45, max: 102, mean: 70.25, variance: 529.1875, stddev: 23.004 },
//     weight:  { sum: 12.3, count: 4, min: 1.8, max: 6, mean: 3.075, variance: 2.896, stddev: 1.7020 } 
//   },
//   dogs: { 
//      cost: { sum: 72, count: 1,  min: 72, max: 72, mean: 72, variance: 0, stddev: 0 },
//      weight: { sum: 5.2, count: 1, min: 5.2, max: 5.2, mean: 5.2, variance: 0, stddev: 0 } 
//   } 
// }
```

## Debugging

To see the HTTP requests being made set an environment variable `DEBUG` before running your code:

```sh
DEBUG=simplenosql node myapp.js
```

## Notes

This library uses Cloudant as its storage engine. It hides some of the complexities of working with Cloudant but if you intend
to use Cloudant in earnest, you may want to be aware of some of the compromises and design decisions that this library has 
made to make it simpler for a first-time user.

Please note:

- the library hides `_rev` tokens from you. They still exist, but you don't see them in returned documents or API calls, nor are
they required when updating or deleting documents. You may want to familiarise yourself with [Cloudant's Multi-version Concurrency Control](https://docs.cloudant.com/mvcc.html)
mechanism to prevent loss of data when the same document is updated in different ways at the same time in a distributed system.
- when this library creates a database with the `create` function, it also creates a [Cloudant Query](https://docs.cloudant.com/cloudant_query.html)
index instructing Cloudant to index all fields with a Lucene-based index. This is convenient but probably not what you want to do in 
a production system. It's much better to only index the fields you need.
- it is still possible to get document conflicts when using this library. Be careful when updating or deleting documents.
- calls to the count/sum/stats function result in a [Design Document](https://docs.cloudant.com/design_documents.html) being generated for 
every combination of keys/values you supply. In a production system, [MapReduce](https://docs.cloudant.com/creating_views.html) views are
usually grouped together with several views per design document. 
- with very large data sets, it's not efficient to page through the result set with the `all` function using 'skip' and 'limit' parameters. 
It's better to [use the startkey_docid parameter](http://glynnbird.tumblr.com/post/56617320962/iterating-over-all-couchdb-documents-the-nice)
- when using this library to communicate with CouchDB 2.0, the `create` function will throw an error because it will fail to create a 
Cloudant Query (Mango) text index. After that, the other functions work although the `query` function will be slow because of the lack
of an index to support it.

It's anticipated that you start using Cloudant with this library and switch to the [Official Cloudant Node.js library](https://github.com/cloudant/nodejs-cloudant)
when you're ready to build some production code.