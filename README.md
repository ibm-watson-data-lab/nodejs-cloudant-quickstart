# cloudant-quickstart

[![Build Status](https://travis-ci.org/ibm-watson-data-lab/nodejs-cloudant-quickstart.svg?branch=master)](https://travis-ci.org/ibm-watson-data-lab/nodejs-cloudant-quickstart)

**Note: this is not the officially supported Cloudant Node.js library. You can find that [here](https://www.npmjs.com/package/cloudant).**

This library is designed for new Cloudant users to import data, make queries and to create aggregations. If you are building a production application, then the [official Cloudant Node.js library](https://www.npmjs.com/package/cloudant) is what you need.

The *cloudant-quickstart* package is a simple Node.js library that can be used to interact with the Cloudant NoSQL database to allow:

- Creation of databases
- Create/Read/Update/Delete of documents
- Bulk insert of arrays of documents
- Queries using Cloudant's query language or using Structured Query Language (SQL)
- Aggregation for counting, summing and statistics

The *cloudant-quickstart* library hides the complexity of Cloudant from you so you never have to see a revision token or craft a design document.

The format of the data you are returned is simplified: revision tokens are removed and complex aggregate JSON structures are pared down to a minimum.

Get started storing, querying and aggregating your data using *cloudant-quickstart*! 

## Installation

Build *cloudant-quickstart* into your own Node.js project with: 

```sh
npm install --save cloudant-quickstart
```

## Using in your application

Start up the library by passing the URL of your Cloudant database:

```js
var url = 'https://username:password@myhost.cloudant.com';
var animals = require('cloudant-quickstart')(url, 'animals');
```

The URL should allow *admin* access to your Cloudant account. 

Alternatively, a single parameter with the URL of the **database** can be supplied:

```js
var url = 'https://username:password@myhost.cloudant.com/animals';
var animals = require('cloudant-quickstart')(url);
```

This library uses Promises so function calls made on the *cloudant-quickstart* object will be of this form:

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

Some of the following code samples omit the Promise `then` and `catch` for brevity, but all database operations are asynchronous.

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

This creates the database in Cloudant. If you are just connecting to a database that *cloudant-quickstart* created for you last time, then there is no need for the `create` step.

The `create` function both creates a database and also instructs Cloudant to index all fields of any documents that are added. This allows queries to be asked of any field in the database. If this behaviour is not required, then simply pass in `false` in the `indexAll` option e.g.

```js
animals.create({indexAll: false})
```

### Adding documents

Add a single document to a database with the `insert` function:

```js
animals
  .insert({ _id: 'dog1', name:'Bobby', colour:'black', collection:'dogs', cost:45, weight:6.4})
  .then(console.log);
// { ok: true, _id: 'dog1' }
```

Documents have a key field `_id` which must be unique across the database. It can either be supplied by you in the object you pass in or can be omitted and one will be generated for you:

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

Arrays of documents are written in batches of 500 at a time.

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

Even if the document id doesn't already exist, *cloudant-quickstart* will write a new document, so in a sense the `update` function is rather like an "upsert" operation: either update and replace the existing document or create a new one. For this reason, an `upsert` function also exists that is a synonym of the `update` function.

You can also just supply an object which contains the keys you wish to update. Let's say you have pre-existing document:

```js
{ '_id': 'fish', 'a': 1, 'b': 2 }
```

and you wish to set this documents value of `b` to be `3` and add a further `c` key. You could
call:

```js
animals.update('fish', {b:3, c:'yellow'}, true);
```

when the final parameter is `true` it shows you want to *merge* the supplied values into the existing object.

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

A database can be queried by passing a object to the `query` function:

```js
// get animals that are white
animals
  .query({colour: 'white'})
  .then(console.log);
// [ { _id: 'cat3', name: 'Snowy', colour: 'white', collection: 'cats', cost:52, weight:6.0 },
//   { _id: 'cat2', name: 'Fluffy', colour: 'white', collection: 'cats', cost:82, weight:2.1 } ]
```

where the query object contains key/value pairs that match the source documents. The key/value pairs are AND'd together:

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

## Querying the database with SQL

You may also query the database using a subset of Structured Query Language (SQL). Your SQL string will be converted into a Cloudant Query object before being sent to the database:

```js
animals.query("SELECT name, cost FROM animals WHERE collection = 'cats' ORDER BY name DESC LIMIT 50");
```

The query may contain a complex WHERE clause:

```js
animals.query("SELECT name, cost FROM animals WHERE (collection = 'cats' OR collection = 'dogs') AND cost < 1000 ORDER BY name DESC LIMIT 500,50");
```

If you are interested in the which Cloudant Query is being created from your SQL input, you can call the `explain` method instead of `query` instead:

```js
console.log(animals.explain('SELECT * FROM animals WHERE a >1'));
// { selector: { a: { '$gt': 1 } } }
````

Not all SQL operations and features are supported. There are no joins, unions, functions or aggregations.

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

Passing an array to `count` causes multi-dimensional counting:

```js
// get counts of animals, grouped by collection and colour
animals
  .count(['collection','colour'])
  .then(console.log);
// { 'cats/black': 1,
//   'cats/tabby': 1,
//   'cats/white': 2,
//   'dogs/grey': 1 }
```

### Summing

To get totals of values from your documents call the `sum` function passing in the field you would like to aggregate:

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

To get the statistics on values from your documents, call the `stats` function passing in the field you would like statistics on:

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

## User management

Create a new Cloudant user with permissions ( `_reader`, `_writer`, `_replicator`, `_admin`):

```js
animals.createUser(['_reader','_writer'])
.then(console.log)
// { password: "YPNCaqvTfi", ok: true, key: "blentfindigl" }
```

A user can be deleted with:

```js
animals.deleteUser('blentfindigl')
.then(console.log)
// { ok: true }
```

## Deleting a database

Delete an entire database with `deleteDB()`:

```js
animals.deleteDB().then(console.log)
// { ok: true }
```

** Careful: deleting a database is a final, non-reversible action **

## Debugging

To see the HTTP requests being made set an environment variable `DEBUG` before running your code:

```sh
DEBUG=cloudant-quickstart node myapp.js
```

## Notes

This library uses Cloudant as its storage engine. It hides some of the complexities of working with Cloudant but if you intend to use Cloudant in earnest, you may want to be aware of some of the compromises and design decisions that this library has made to make it simpler for a first-time user.

Please note:

- the library hides `_rev` tokens from you. They still exist, but you don't see them in returned documents or API calls, nor are
they required when updating or deleting documents. You may want to familiarise yourself with [Cloudant's Multi-version Concurrency Control](https://docs.cloudant.com/mvcc.html) mechanism to prevent loss of data when the same document is updated in different ways at the same time in a distributed system.
- when this library creates a database with the `create` function, it also creates a [Cloudant Query](https://docs.cloudant.com/cloudant_query.html) index instructing Cloudant to index all fields with a Lucene-based index. This is convenient but probably not what you want to do in a production system. It's much better to only index the fields you need.
- it is still possible to get document conflicts when using this library. Be careful when updating or deleting documents. see [Introduction to Document Conflicts](https://developer.ibm.com/dwblog/2015/cloudant-document-conflicts-one/)
- calls to the count/sum/stats function result in a [Design Document](https://docs.cloudant.com/design_documents.html) being generated for every combination of keys/values you supply. In a production system, [MapReduce](https://docs.cloudant.com/creating_views.html) views are usually grouped together with several views per design document. See [Cloudant Design Document Management](https://docs.cloudant.com/design_document_management.html)
- with very large data sets, it's not efficient to page through the result set with the `all` function using 'skip' and 'limit' parameters. It's better to [use the startkey_docid parameter](http://glynnbird.tumblr.com/post/56617320962/iterating-over-all-couchdb-documents-the-nice)
- when using this library to communicate with CouchDB 2.0, the `create` function will throw an error because it will fail to create a Cloudant Query (Mango) text index. After that, the other functions work although the `query` function will be slow because of the lack of an index to support it.

It's anticipated that you start using Cloudant with this library and switch to the [Official Cloudant Node.js library](https://github.com/cloudant/nodejs-cloudant) when you're ready to build some production code.

## Contributing

This is an open-source library released under the Apache-2.0 license. Please feel free to raise issues where you find a problem or wish to request a feature, or submit a Pull Request if you have an improvement to contribute.
