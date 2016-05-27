# Ravel
![Ravel](https://avatars2.githubusercontent.com/u/12835831?v=3&s=128)

> Forge past a tangle of modules. Make a cool app.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/raveljs/ravel/master/LICENSE) [![npm version](https://badge.fury.io/js/ravel.svg)](http://badge.fury.io/js/ravel) [![Dependency Status](https://david-dm.org/raveljs/ravel.svg)](https://david-dm.org/raveljs/ravel) [![npm](https://img.shields.io/npm/dm/ravel.svg?maxAge=2592000)]() [![Build Status](https://travis-ci.org/raveljs/ravel.svg?branch=master)](https://travis-ci.org/raveljs/ravel) [![Code Climate](https://codeclimate.com/github/raveljs/ravel/badges/gpa.svg)](https://codeclimate.com/github/raveljs/ravel) [![Test Coverage](https://codeclimate.com/github/raveljs/ravel/badges/coverage.svg)](https://codeclimate.com/github/raveljs/ravel/coverage)

Ravel is a tiny, sometimes-opinionated foundation for creating organized, maintainable, and scalable web applications in [node.js](https://github.com/joyent/node) with [ES2016/2017](http://kangax.github.io/compat-table/esnext/).

## Table of Contents

<!-- TOC depthFrom:2 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Table of Contents](#table-of-contents)
- [Introduction](#introduction)
- [Installation](#installation)
- [Architecture](#architecture)
	- [Modules (and Errors)](#modules-and-errors)
	- [Routes](#routes)
	- [Resources](#resources)
	- [Babel configuration](#babel-configuration)
	- [Bringing it all together](#bringing-it-all-together)
- [API Documentation](#api-documentation)
	- [Ravel](#ravel)
	- [Ravel.Module](#ravelmodule)
	- [Ravel.Error](#ravelerror)
	- [Ravel.Resource](#ravelresource)
	- [Ravel.Routes](#ravelroutes)
	- [Dependency Injection and Namespacing](#dependency-injection-and-namespacing)
	- [Managed Parameter System](#managed-parameter-system)
	- [Lifecycle Decorators](#lifecycle-decorators)
	- [Transaction-per-request](#transaction-per-request)
	- [Database Providers](#database-providers)
	- [Authentication and Authorization](#authentication-and-authorization)
	- [Authorization Providers](#authorization-providers)
	- [Metadata and Reflection](#metadata-and-reflection)
- [Deployment and Scaling](#deployment-and-scaling)

<!-- /TOC -->

## Introduction

Ravel is inspired by the simplicity of [koa](http://koajs.com/) and [express](http://expressjs.com), but aims to provide a pre-baked, well-tested and highly modular solution for creating enterprise web applications by providing:

- A standard set of well-defined architectural components so that your code stays **organized**
- Rapid **REST API** definition
- Easy **bootstrapping** via an enforced, reference configuration of [koa](http://koajs.com/) with critical middleware

- Dependency injection (instead of relative `require`s)
And a few other features, plucked from popular back-end frameworks:
- Transaction-per-request
- Simple authentication and authorization configuration (no complex [passport](https://github.com/jaredhanson/passport) setup)
- Externalized session storage for horizontal scalability

Ravel is layered on top of awesome technologies, including:
- [koa](http://koajs.com/)
- [babel](babeljs.io)
- [Passport](https://github.com/jaredhanson/passport)
- [Intel](https://github.com/seanmonstar/intel)
- [Redis](https://github.com/antirez/redis)
- [docker](docker.com)


## Installation

> As Ravel uses the Spread operator from ES2015, you will need to use a 5.x+ distribution of node.

```bash
$ npm install ravel
```

Ravel also relies on [Redis](https://github.com/antirez/redis). If you don't have it installed and running, try using [docker](docker.com) to quickly spin one up:

```bash
$ docker run -d -p 6379:6379 redis
```

## Architecture

Ravel applications consist of a few basic parts:

- **Modules:** plain old classes which offer a great place to write modular application logic, middleware, authorization logic, etc.
- **Routes:** a low-level place for general routing logic
- **Resources:** built on top of `Routes`, `Resource`s are REST-focused
- **Errors:** Node.js `Error`s which are associated with an HTTP response code. `throw` them or `reject` with them and `Routes` and `Resource`s will respond accordingly

If you're doing it right, your applications will consist largely of `Module`s, with a thin layer of `Routes` and `Resource`s on top.

### Modules (and Errors)

`Module`s are plain old node.js modules containing a single class which encapsulates application logic. `Module`s support dependency injection of core Ravel services and other Modules alongside npm dependencies *(no relative `require`'s!)*. `Module`s are instantiated safely in dependency-order, and cyclical dependencies are detected automatically.

*modules/cities.js*
```javascript
const Ravel = require('ravel');
const Error = Ravel.Error;
const Module = Ravel.Module;
const inject = Ravel.inject;

/**
 * An Error we will throw when a requested city is not found.
 * This Error will be associated with the HTTP error code 404.
 */
class MissingCityError extends Error {
  constructor(name) {
    super(`City ${name} does not exist.`, constructor, Ravel.httpCodes.NOT_FOUND);
  }
}

/**
 * Our main Module, defining logic for working with Cities
 */
@inject('async')
class Cities extends Module {
  constructor(async) {
    super();
    this.async = async;
    this.db = ['Toronto', 'New York', 'Chicago']; // our fake 'database'
  }

  getAllCities() {
    return Promise.resolve(c);
  }

  getCity(name) {
    return new Promise((resolve, reject) => {
      const index = this.db.indexOf(name);
      if (index) {
        resolve(this.db[index]);
      } else {
        this.log.warn(`User requested unknown city ${name}`);
        // Ravel will automatically respond with the appropriate HTTP status code!
        reject(new MissingCityError(name));
      }
    });
  }
}
```

### Routes

`Routes` are Ravel's lower-level wrapper for `koa` (`Resource`s are the higher-level one). They support GET, POST, PUT and DELETE requests, and middleware, via decorators. Like `Module`s, they also support dependency injection. Though `Routes` can do everything `Resources` can do, they are most useful for implementing non-REST things, such as static content serving or template serving (EJS, Jade, etc.). If you want to build a REST API, use `Resource`s instead (they're up next!).

*routes/index.js*
```javascript
const Ravel = require('ravel');
const Routes = Ravel.Routes;
const inject = Ravel.inject;
const before = Routes.before; // decorator to add middleware to an endpoint within the Routes
const mapping = Routes.mapping; // decorator to associate a handler method with an endpoint

@inject('middleware1') // middleware from NPM, or your own modules, etc.
class ExampleRoutes extends Routes {
  constructor(middleware1) {
    super('/'); // base path for all routes in this class. Will be prepended to the @mapping.
    this.middleware1 = middleware1;
    // you can also build middleware right here!
    this.middleware2 = function*(next) {
      yield next;
    };
  }

  @mapping(Routes.GET, 'app') // bind this method to an endpoint and verb with @mapping. This one will become GET /app
  @before('middleware1','middleware2') // use @before to place middleware before appHandler
  appHandler(ctx) {
    // ctx is just a koa context! Have a look at the koa docs to see what methods and properties are available.
    ctx.body = '<!DOCTYPE html><html><body>Hello World!</body></html>';
    ctx.status = 200;
  }
}
```

### Resources

What might be referred to as a *controller* in other frameworks, a `Resource` module defines HTTP methods on an endpoint, supporting the session-per-request transaction pattern via Ravel middleware. `Resource`s also support dependency injection, allowing for the easy creation of RESTful interfaces to your `Module`-based application logic. Resources are really just a thin wrapper around `Routes`, using specially-named handler functions (`get`, `getAll`, `post`, `put`, `putAll`, `delete`, `deleteAll`) instead of `@mapping`. This convention-over-configuration approach makes it easier to write proper REST APIs with less code, and is recommended over carefully chosen `@mapping`s in a `Routes` class.

*resources/city.js*
```javascript
// Resources support dependency injection too!
// Notice that we have injected our cities Module by name.
const Ravel = require('ravel');
const Resource = Ravel.Resource;
const inject = Ravel.inject;
const before = Resource.before; // decorator to add middleware to an endpoint within the Resource

// using @before at the class level decorates all endpoint methods with middleware
@before('respond') // 'respond' is built-in Ravel rest response middleware
@inject('cities')
class CitiesResource extends Resource {
  constructor(cities) {
    super('/cities'); //base path
    this.cities = cities;

    // some other middleware, which you might have injected or created here
    this.anotherMiddleware = function*(next) {
      yield next;
    };
  }

  // no need to use @mapping here. Routes methods are automatically mapped using their names.
  getAll(ctx) { // just like in Routes, ctx is a koa context.
     return this.cities.getAllCities()
     .then((list) => {
       ctx.body = list;
     });
  }

  @before('anotherMiddleware') // using @before at the method level decorates this method with middleware
  get(ctx) { // get routes automatically receive an endpoint of /cities/:id (in this case).
    return this.cities.getCity(ctx.params.id)
    .then((city) => {
      ctx.body = city;
    });
  }

  // post, put, putAll, delete and deleteAll are
  // also supported. Not specifying them for
  // this resource will result in calls using
  // those verbs returning HTTP 501 NOT IMPLEMENTED

  // postAll is not supported, because it makes no sense
}
```

### Babel configuration

Since decorators are not yet available in Node, you will need to use Babel to transpile them into ES2015-compliant code.

```bash
$ npm install babel@6.5.2 babel-plugin-transform-decorators-legacy@1.3.4 babel-register@6.8.0
```

Place this `.babelrc` config file at the root of your source code.

*.babelrc*
```json
{
  "plugins": ["transform-decorators-legacy"],
  "only": [
    "test/**/*.js"
  ],
  "retainLines": true
}
```

### Bringing it all together

*app.js*
```javascript
//TODO remove when decorators land in node. Should probably pre-transpile in a production app.
require('babel-register');

const app = new require('ravel')();

// parameters like this can be supplied via a .ravelrc file
app.set('keygrip keys', ['mysecret']);

app.modules('./modules'); //import all Modules from a directory
app.resources('./resources');  //import all Resources from a directory
app.routes('./routes/index.js');  //import all Routes from a file

// start it up!
app.start();
```

```bash
$ node --harmony_rest_parameters app.js
```

## API Documentation

### Ravel

TODO

### Ravel.Module

TODO

### Ravel.Error

TODO

### Ravel.Resource

TODO

### Ravel.Routes

TODO

### Dependency Injection and Namespacing

TODO

### Managed Parameter System

TODO

### Lifecycle Decorators

TODO

### Transaction-per-request

TODO

### Database Providers

TODO

### Authentication and Authorization

TODO

### Authorization Providers

TODO

### Metadata and Reflection

TODO

## Deployment and Scaling

TODO
