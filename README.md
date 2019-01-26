# Ravel
> Forge past a tangle of modules. Make a cool app.

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/raveljs/ravel/master/LICENSE) [![npm version](https://badge.fury.io/js/ravel.svg)](http://badge.fury.io/js/ravel) [![Dependency Status](https://david-dm.org/raveljs/ravel.svg)](https://david-dm.org/raveljs/ravel) [![npm](https://img.shields.io/npm/dm/ravel.svg?maxAge=2592000)](https://www.npmjs.com/package/ravel) [![Build Status](https://travis-ci.org/raveljs/ravel.svg?branch=master)](https://travis-ci.org/raveljs/ravel) [![Build status](https://ci.appveyor.com/api/projects/status/5kx5j2d1fhyn9yn3/branch/master?svg=true)](https://ci.appveyor.com/project/Ghnuberath/ravel/branch/master) [![Test Coverage](https://codeclimate.com/github/raveljs/ravel/badges/coverage.svg)](https://codeclimate.com/github/raveljs/ravel/coverage) [![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/Flet/semistandard)

Ravel is a [tiny](https://npm.anvaka.com/#/view/2d/ravel), sometimes-opinionated foundation for creating organized, maintainable, and scalable web applications in [node.js](https://github.com/joyent/node) with [ES2016/2017](http://kangax.github.io/compat-table/esnext/).

**Note:** The `master` branch may be in an unstable or even broken state during development. Please use [releases](https://github.com/raveljs/ravel/releases) instead of the `master` branch to explore stable code.

## Table of Contents

<!-- TOC depthFrom:2 depthTo:3 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Table of Contents](#table-of-contents)
- [Introduction](#introduction)
- [Installation](#installation)
- [Architecture](#architecture)
  - [Modules (and Errors)](#modules-and-errors)
  - [Middleware](#middleware)
  - [Routes](#routes)
  - [Resources](#resources)
  - [Bringing it all together](#bringing-it-all-together)
  - [Decorator Transpilation](#decorator-transpilation)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Ravel App](#ravel-app)
  - [Managed Configuration System](#managed-configuration-system)
  - [Ravel.Error](#ravelerror)
  - [Ravel.Module](#ravelmodule)
  - [Ravel.Routes](#ravelroutes)
  - [Ravel.Resource](#ravelresource)
  - [Response Caching](#response-caching)
  - [Database Providers](#database-providers)
  - [Transaction-per-request](#transaction-per-request)
  - [Scoped Transactions](#scoped-transactions)
  - [Authentication Providers](#authentication-providers)
  - [Authentication](#authentication)
  - [WebSockets](#websockets)
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
- Simple authentication and authentication configuration (no complex [passport](https://github.com/jaredhanson/passport) setup)
- (Optional) externalized session storage for horizontal scalability

Ravel is deliberately designed to [minimize unnecessary dependencies](https://npm.anvaka.com/#/view/2d/ravel) and have a small, well-documented codebase, making it easier to create secure and robust applications you and your users can trust.

Ravel is layered on top of, and designed to be used with, awesome technologies, including:
- [koa](http://koajs.com/)
- [Passport](https://github.com/jaredhanson/passport)
- [Intel](https://github.com/seanmonstar/intel)
- [Redis](https://github.com/antirez/redis)
- [docker](http://docker.com)


## Installation

> As Ravel uses async/await and several other ES2015/2016 features, you will need to use a 8.0.x+ distribution of node

```bash
$ npm install ravel
```

## Architecture

Ravel applications consist of a few basic parts:

- **Modules:** plain old classes which offer a great place to define modular application logic, middleware, authentication logic, etc.
- **Middleware** a familiar concept from `express` or `koa`-like frameworks, middleware are chained functions which run in sequence against a request to a specific route.
- **Routes:** a low-level place for general routing logic
- **Resources:** built on top of `Routes`, `Resource`s are REST-focused
- **Errors:** Node.js `Error`s which are associated with an HTTP response code. `throw` them in your code and `Routes` and `Resource`s will automatically produce responses with a matching status.

If you're doing it right, your applications will consist largely of `Module`s, with a thin layer of `Routes` and `Resource`s on top.

### Modules (and Errors)

`Module`s are plain old node.js modules exporting a single class which encapsulates application logic. `Module`s support dependency injection of core Ravel services and other Modules alongside npm dependencies *(no relative `require`'s!)*. `Module`s are instantiated safely in dependency-order, and cyclical dependencies are detected automatically.

For more information about `Module`s, look at [Ravel.Module](#ravelmodule) below.

*modules/cities.js*
```javascript
const Ravel = require('ravel');
const Error = Ravel.Error;
const Module = Ravel.Module;
const inject = Ravel.inject;

/**
 * First, we'll define an Error we will throw when a requested
 * city is not found. This Error will be associated with the
 * HTTP error code 404.
 */
class MissingCityError extends Error {
  constructor (name) {
    super(`City ${name} does not exist.`, Ravel.httpCodes.NOT_FOUND);
  }
}

/**
 * Our main Module, defining logic for working with Cities
 */
@inject('moment', '$log')
@Module('cities')
class Cities {
  constructor (moment, $log) {
    this.moment = moment;
    this.$log = $log
    this.cities = ['Toronto', 'New York', 'Chicago']; // our fake 'database'
  }

  getAllCities () {
    return Promise.resolve(this.cities);
  }

  getCity (name) {
    return new Promise((resolve, reject) => {
      const index = this.cities.indexOf(name);
      if (index !== -1) {
        resolve(this.cities[index]);
      } else {
        // Ravel will automatically respond with the appropriate HTTP status code!
        this.$log.warn(`User requested unknown city ${name}`);
        reject(new MissingCityError(name));
      }
    });
  }
}

// Export Module class
module.exports = Cities;
```

### Middleware

`Ravel` middleware takes the form of an `async funtion` and is defined within `Modules`:

*modules/cities.js*
```js
const Ravel = require('ravel');
const Module = Ravel.Module;
const middleware = Module.middleware;
class MyMiddleware {
  // this middleware will be available by name elsewhere in the application
  @middleware('custom-middleware')
  async doSomething(ctx, next) {
    // ... do something before the next middleware runs
    await next();
    // ... do something after the next middlware runs
  }
}
```

### Routes

`Routes` are `Ravel`'s lower-level wrapper for `koa` (`Resource`s are the higher-level one). They support GET, POST, PUT and DELETE requests, and middleware, via decorators. Like `Module`s, they also support dependency injection. Though `Routes` can do everything `Resources` can do, they are most useful for implementing non-REST things, such as static content serving, proxying, etc. If you want to build a REST API, use `Resource`s instead (they're up next!).

For more information about `Routes`, look at [Ravel.Routes](#ravelroutes) below.

*routes/index.js*
```javascript
const Ravel = require('ravel');
const Routes = Ravel.Routes;
const inject = Ravel.inject;
const before = Routes.before; // decorator to chain middleware before an endpoint
const mapping = Routes.mapping; // decorator to associate a handler method with an endpoint

@Routes('/') // base path for all routes in this class. Will be prepended to the @mapping.
class ExampleRoutes {
  // bind this method to an endpoint and verb with @mapping. This one will become GET /app
  @mapping(Routes.GET, 'app')
  @before('custom-middleware') // use @before to place multiple middleware (comma-separated names) before appHandler - these could be npm modules, functions on this scope, or defined via @middleware
  async appHandler (ctx) {
    // ctx is just a koa context! Have a look at the koa docs to see what methods and properties are available.
    ctx.body = '<!DOCTYPE html><html><body>Hello World!</body></html>';
    ctx.status = 200;
  }
}

// Export Routes class
module.exports = ExampleRoutes;
```

### Resources

What might be referred to as a *controller* in other frameworks, a `Resource` module defines HTTP methods on an endpoint, supporting the session-per-request transaction pattern via Ravel middleware. `Resource`s also support dependency injection, allowing for the easy creation of RESTful interfaces to your `Module`-based application logic. Resources are really just a thin wrapper around `Routes`, using specially-named handler functions (`get`, `getAll`, `post`, `put`, `putAll`, `delete`, `deleteAll`) instead of `@mapping`. This convention-over-configuration approach makes it easier to write proper REST APIs with less code, and is recommended over "carefully chosen" `@mapping`s in a `Routes` class.

For more information about `Resource`s, look at [Ravel.Resource](#ravelresouce) below.

*resources/city.js*
```javascript
// Resources support dependency injection too!
// Notice that we have injected our cities Module by name.
const Ravel = require('ravel');
const Resource = Ravel.Resource;
const inject = Ravel.inject;
const before = Resource.before; // decorator to add middleware to an endpoint within the Resource

// using @before at the class level decorates all endpoint methods with middleware
@inject('cities')
@Resource('/cities') // base path for all routes in this Resource
class CitiesResource {
  constructor (cities) {
    this.cities = cities;
  }

  // no need to use @mapping here. Routes methods are automatically mapped using their names.
  async getAll (ctx) { // just like in Routes, ctx is a koa context.
    ctx.body = await this.cities.getAllCities();
  }

  @before('custom-middleware') // using @before at the method level decorates this method with middleware
  async get (ctx) { // get routes automatically receive an endpoint of /cities/:id (in this case).
    ctx.body = await this.cities.getCity(ctx.params.id);
  }

  // post, put, putAll, delete and deleteAll are
  // also supported. Not specifying them for
  // this resource will result in calls using
  // those verbs returning HTTP 501 NOT IMPLEMENTED

  // postAll is not supported, because it makes no sense
}

// Export Resource class
module.exports = CitiesResource;
```

### Bringing it all together

*app.js*
```javascript
const app = new require('ravel')();

// parameters like this can be supplied via a .ravelrc.json file
app.set('keygrip keys', ['mysecret', 'anothersecret']);

app.scan('./modules'); //import all Modules from a directory
app.scan('./resources');  //import all Resources from a directory
app.scan('./routes/index.js');  //import all Routes from a file

// start it up!
app.start();
```

### Decorator Transpilation

Since decorators are not yet available in Node, you will need to use a transpiler to convert them into ES2016-compliant code. We have chosen [Babel](https://babeljs.io/) as our recommended transpiler.

```bash
$ npm install gulp-sourcemaps@1.6.0 babel-core@6.18.2 babel-plugin-transform-decorators-legacy@1.3.4 gulp-babel@6.1.2
# Note, please add babel-plugin-transform-async-to-generator@6.16.0 if you are using Node v6 instead of v7.
```

*gulpfile.js*
```js
const babelConfig = {
  'retainLines': true,
  'plugins': ['transform-decorators-legacy'] // add 'transform-async-to-generator' if you are using Node v6 instead of v7
};
gulp.task('transpile', function () {
  return gulp.src('src/**/*.js') // point it at your source directory, containing Modules, Resources and Routes
      .pipe(plugins.sourcemaps.init())
      .pipe(plugins.babel(babelConfig))
      .pipe(plugins.sourcemaps.write('.'))
      .pipe(gulp.dest('dist'));  // your transpiled Ravel app will appear here!
});
```

Check out the [starter project](https://github.com/raveljs/ravel-github-mariadb-starter) to see a working example of this build process.

### Running the Application

```bash
$ node dist/app.js
```

## API Documentation
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/)

### Ravel App
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#ravel)

A Ravel application is a root application file (such as `app.js`), coupled with a collection of files exporting `Module`s, `Resource`s and `Routes` (see [Architecture](#architecture) for more information). Getting started is usually as simple as creating `app.js`:

*app.js*
```js
const Ravel = require('ravel');
const app = new Ravel();

(async () => {
  // you'll register managed parameters, and connect Modules, Resources and Routes here
  await app.init();
  // you'll set managed parameters here
  // ...
  // then start the server
  await app.listen();
})();
```

### Managed Configuration System

Traditional `node` appliations often rely on `process.env` for configuration. This can lead to headaches when an expected value is not declared in the environment, a value is supplied but doesn't match any expected ones, or the name of an environment variable changes and refactoring mistakes are made. To help mitigate this common issue, Ravel features a simple configuration system which relies on three methods:

#### app.registerParameter
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Ravel#registerParameter)

Create managed parameters with `app.registerParameter()`:

*app.js*
```js
const Ravel = require('ravel');
const app = new Ravel();

// register a new optional parameter
app.registerParameter('my optional parameter');
// register a new required parameter
app.registerParameter('my required parameter', true);
// register a required parameter with a default value
app.registerParameter('my third parameter', true, 'some value');

(async () => {
  await app.init();
  await app.listen();
})();
```

Many Ravel plugin libraries will automatically create parameters which you will have to supply values for. These parameters will be documented in their `README.md`.

#### app.set
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Ravel#set)

Provide values via `app.set()`. Setting an unknown parameter will result in an `Error`.

*app.js*
```js
const Ravel = require('ravel');
const app = new Ravel();

// register a new optional parameter
app.registerParameter('my optional parameter');

(async () => {
  await app.init();

  // set a value
  app.set('my optional parameter', 'some value');
  // this won't work:
  app.set('an unknown parameter', 'some value');

  await app.listen();
})();
```

#### app.get
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Ravel#get)

Retrieve values via `app.get()`. Retrieving an unknown parameter will result in an `Error`.

*app.js*
```js
const Ravel = require('ravel');
const app = new Ravel();

// register a new parameter
app.registerParameter('my required parameter', true, 'default value');

(async () => {
  await app.init();

  // set a value
  app.set('my required parameter', 'some value');
  // get a value
  app.get('my required parameter') === 'some value';
  // this won't work:
  // app.get('an unknown parameter');

  await app.listen();
})();
```

#### Core parameters

Ravel has several core parameters:

```js
// set initial keygrip keys for cookie signing (recommend at least 5):
app.set('keygrip keys', ['my super secret key', 'another super secret key']);

// these are optional (default values are shown):
app.set('redis host', undefined); // set to point to an external redis server (required for horizontal scaling).
app.set('redis port', 6379);
app.set('redis password', undefined);
app.set('redis max retries', 10); // connection retries
app.set('port', 8080); // port the app will run on
app.set('https', false) // listen for https instead of http
app.set('https options', {}) // any options to pass to the https server app.set('https', true). Supports options from https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
app.set('session key', 'ravel.sid'); // the cookie name to use for sessions
app.set('session max age', null); // session maxAge (default never expires)
app.set('session secure', true); // toggles Secure attribute for session cookies. true by default, and always true when app.get('https') is true.
app.set('app route', '/'); // if you have a UI, this is the path users will be sent to when they are logged in
app.set('login route', '/login'); // if users aren't logged in and you redirect them, this is where they'll be sent
app.set('public directory', undefined); // if you want to statically serve a directory
app.set('favicon path', undefined); // favicon middleware configuration
app.set('enable websockets', true); // set to false to disable websocket server
app.set('max websocket payload bytes', 100 * 1024 * 1024); // max payload size (in bytes) of a websocket message
app.set('redis websocket channel prefix', 'ravel.ws'); // default key prefix for websocket redis channels
```

#### .ravelrc.json

To make it easier to supply configuration values to Ravel, a `.ravelrc.json` file can be placed beside `app.js` (or in any parent directory of `app.js`). This is the recommended method of setting parameters.

*.ravelrc.json*
```
{
  "keygrip keys": ["my super secret key", "another super secret key"]
}
```

You can also use environment variables in `.ravelrc.json` file which will be interpolated using `process.env` at startup time:

```
{
  "keygrip keys": "$MY_SUPER_SECRET_KEY",
  "mysql connection string":
  "mysql:///$MYSQL_USER:$MYSQL_PASSWORD@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DB"
}
```

### Ravel.Error
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Ravel.Error)

This is the base `Error` type for Ravel, meant to be extended into semantic errors which can be used within your applications. When you create a custom `Ravel.Error`, you **must** provide an associated HTTP status code, which Ravel will automatically respond with if an HTTP request results in that particular `Error` being thrown. This helps create meaningful status codes for your REST APIs while working within traditional `node` error-handling paradigms (`throw/try/catch` and `Promise.reject()`). Errors are generally best-declared within `Module`, `Resource` or `Routes` files (and not exported), closest to where they are used. If necessary, create a `Module` to group and export them.

*at the top of some `Module`, `Resource` or `Routes` file (we'll get to this next)*
```js
const Ravel = require('ravel');
/**
 * Thrown when a user tries to POST something unexpected to /upload
 */
class UploadError extends Ravel.Error {
  constructor (msg) {
    super(msg, Ravel.httpCodes.BAD_REQUEST);
  }
}
```

### Ravel.Module
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#module)

`Module`s are meant to contain the bulk of your application logic, either to support endpoints defined in `Resource`s and `Routes`, or to perform tasks at specific points during the Ravel lifecycle (see [Lifecycle Decorators](#lifecycle-decorators) below).

Here's a simple module:

*modules/my-module.js*
```js
const Ravel = require('ravel');
const inject = Ravel.inject; // Ravel's dependency injection decorator
const Module = Ravel.Module; // base class for Ravel Modules

// inject a custom ravel Module (or your plain classes) beside npm dependencies!
@Module('mymodule')
@inject('path', 'fs', 'custom-module', 'plain-class')
class MyModule {
  constructor (path, fs, custom, plain) { // @inject'd modules are available here as parameters
    this.path = path;
    this.fs = fs;
    this.custom = custom;
    this.plain = plain;
  }

  // implement any methods you like :)
  aMethod () {
    // ...
  }

  async anAsyncMethod () {
    // ...
  }
}

module.exports = MyModule; // you must export your Module so that Ravel can require() it.
```

#### Dependency Injection and Module Registration
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#inject)

Ravel's *dependency injection* system is meant to address several issues with traditional `require()`s:

- Using `require()` with one's own modules in a complex project often results in statements like this: `require('../../../../my/module');`. This issue is especially pronounced when `require()`ing source modules in test files.
- Cyclical dependencies between modules are not always obvious in a large codebase, and can result in unexpected behaviour.

Ravel addresses this with the the [`@inject`](http://raveljs.github.io/docs/latest/index.html#inject) decorator:

*modules/my-module.js*
```js
const Ravel = require('ravel');
const inject = Ravel.inject;
const Module = Ravel.Module;

@Module('mymodule')
@inject('another-module') // inject another Module from your project without require()!
class MyModule {
  constructor (another) { // @inject'd modules are available here as parameters
    this.another = another;
  }
}
module.exports = MyModule;
```

The injection name of `another-module` is inferred from its filename, but can be overriden via the `@Module('custom-name')` decorator.

If runnning `app.scan('./modules')`:
- `'./modules/my-module'` will be injectable as `'my-module'`
- `'./modules/another-module'` will be injectable as `'another-module'`
- `'./modules/package/another-module'` will be injectable as `'package.another-module'`

`Module`s are singletons which are instantiated in *dependency-order* (i.e. if `A` depends on `B`, `B` is guaranteed to be constructed first). Cyclical dependencies are detected automatically and result in an `Error`.

To further simplify working with imports in Ravel, you can `@inject` Ravel services, the core node API, and `npm` dependencies (installed in your local `node_modules` or globally) alongside your own `Module`s:

```js
const Ravel = require('ravel');
const inject = Ravel.inject;
const Module = Ravel.Module;

@Module('mymodule')
@inject('another-module', 'fs', 'moment', '$err') // anything that can be require()d can be @injected
class MyModule {
  constructor (another, fs, moment, $err) {
    // ...
  }
}
module.exports = MyModule;
```

To avoid constructors which simply perform assignments, Ravel includes the `@autoinject` decorator which can perform assignments for you:

*modules/my-module.js*
```js
const Ravel = require('ravel');
const inject = Ravel.inject;
const Module = Ravel.Module;

@Module('mymodule')
@inject('another') // you can still mix using @inject!
@autoinject('fs', 'moment', '$err')
class MyModule {
  constructor (another) { // @inject'd modules are available here as parameters
    this.another = another;
    // @autoinjection takes place AFTER construction, so fs,
    // moment and $err are not available here.
  }
  method () {
    // this.fs, this.moment and this.$err are available here
  }
}
module.exports = MyModule;
```

#### Core Services

Several core `Ravel` services are available for injection within your `Module`s, `Resource`s and `Routes`:

- `@inject('$app')` - A reference to the ravel app object itself
- `@inject('$err')` - Built-in error types
- `@inject('$log')` - A logger scoped to the target module
- `@inject('$kvstore')` - A reference to the internal redis connection (or mock, in the case where no external redis is supplied)
- `@inject('$params')` - A read-only reference to the parameter system, to retrieve parameter values
- `@inject('$db')` - A mechanism for creating scoped transactions. See [Scoped Transactions](#scoped-transactions) below for more information.

#### Module Namespacing

In a large project, it may become desirable to namespace your `Module`s to avoid naming conflicts. This is easily accomplished with Ravel by separating source files for `Module`s into different directories. Let's assume the following project structure:

```
app.js
.ravelrc.json
modules/
  core/
    my-module.js
  util/
    my-module.js
```

Then, import the `Module` directory as before, using `app.scan()`:

*app.js*
```js
// ...
const app = new Ravel();
app.scan('./modules');
// core/my-module can now be injected using @inject(core.my-module)!
// util/my-module can now be injected using @inject(util.my-module)!
```

> Essentially, Ravel ignores the path you pass to `app.scan()` and uses any remaining path components to namespace `Module`s.

#### Lifecycle Decorators
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Module.postinit)

`Module`s are also a great place to define logic which should run at particular points during the Ravel lifecycle. Decorating a `Module` method with a lifecycle decorator appropriately results in that method firing exactly once at the specified time (with the exception of `@interval`, of course):

```js
const Ravel = require('ravel');
const Module = Ravel.Module;
const prelisten = Module.prelisten;

@Module('init-module')
class MyInitModule {
  // ...
  @prelisten
  initDBTables () {
    // ...
  }
}
module.exports = MyInitModule;
```

There are currently six lifecycle decorators:

- `@postinit` fires at the end of `Ravel.init()`
- `@prelisten` fires at the beginning of `Ravel.listen()`
- `@postlisten` fires at the end of `Ravel.listen()`
- `@preclose` fires at the beginning of `Ravel.close()`
- `@interval(1000)` fires at the end of `Ravel.listen()` and then repeatedly at the specified interval until `Ravel.close()`
- `@koaconfig` fires during `Ravel.init()`, after Ravel is finished configuring the underlying `koa` app object with global middleware. Methods decorated with `@koaconfig` receive a reference to the underlying `koa` app object for customization. This decorator is meant for exceptional circumstances, since (unnecessarily) global middleware constitutes a hot path and can lead to inefficiency.

### Ravel.Routes
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#routes)

`Routes` are Ravel's abstraction of `koa`. They provide Ravel with a simple mechanism for registering `koa` routes, which should (generally) only be used for serving templated pages or static content (not for building RESTful APIs, for which `Ravel.Resource` is more applicable). Extend this abstract superclass to create a `Routes` module.

Like `Module`s, `Routes` classes support dependency injection, allowing easy connection of application logic and web layers.

Endpoints are created within a `Routes` class by creating an `async` method and then decorating it with [`@mapping`](http://raveljs.github.io/docs/latest/index.html#Routes.mapping). The `@mapping` decorator indicates the subpath for the route (concatenated with the base path passed to `super()` in the `constructor`), as well as the HTTP verb. The method handler accepts a single argument `ctx` which is a [koa context](http://koajs.com/#context). Savvy readers with `koa` experience will note that, within the handler, `this` refers to the instance of the Routes class (to make it easy to access injected `Module`s), and the passed `ctx` argument is a reference to the `koa` context.

*routes/my-routes.js*
```js
const inject = require('ravel').inject;
const Routes = require('ravel').Routes;
const mapping = Routes.mapping; // Ravel decorator for mapping a method to an endpoint
const before = Routes.before;   // Ravel decorator for conneting middleware to an endpoint

// you can inject your own Modules and npm dependencies into Routes
@inject('koa-bodyparser', 'fs', 'custom-module')
@Routes('/') // base path for all routes in this class
class MyRoutes {
  // The constructor for a `Routes` class must call `super()` with the base
  // path for all routes within that class. Koa path parameters such as
  // :something are supported.
  constructor (bodyParser, fs, custom) {
    this.bodyParser = bodyParser(); // make bodyParser middleware available
    this.fs = fs;
    this.custom = custom;
  }

  // will map to GET /app
  @mapping(Routes.GET, 'app'); // Koa path parameters such as :something are supported
  @before('bodyParser') // use bodyParser middleware before handler. Matches this.bodyParser created in the constructor.
  async appHandler (ctx) {
    ctx.status = 200;
    ctx.body = '<!doctype html><html></html>';
    // ctx is a koa context object.
    // await on Promises and use ctx to create a body/status code for response
    // throw a Ravel.Error to automatically set an error status code
  }
}

module.exports = MyRoutes;
```

#### Registering Routes

Much like `Module`s, `Routes` can be added to your Ravel application via `app.scan('path/to/routes')`:

*app.js*
```js
// ...
const app = new Ravel();
app.scan('./routes');
```

### Ravel.Resource
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#resource)

What might be referred to as a *controller* in other frameworks, a `Resource` module defines HTTP methods on an endpoint. `Resource`s also support dependency injection, allowing for the easy creation of RESTful interfaces to your `Module`-based application logic. Resources are really just a thin wrapper around `Routes`, using specially-named handler methods (`get`, `getAll`, `post`, `put`, `putAll`, `delete`, `deleteAll`) instead of `@mapping`. This convention-over-configuration approach makes it easier to write proper REST APIs with less code, and is recommended over ~~carefully chosen~~ `@mapping`s in a `Routes` class. Omitting any or all of the specially-named handler functions is fine, and will result in a `501 NOT IMPLEMENTED` status when that particular method/endpoint is requested. `Resource`s inherit all the properties, methods and decorators of `Routes`. See [core/routes](http://raveljs.github.io/docs/latest/index.html#routes) for more information. Note that `@mapping` does not apply to `Resources`.

As with `Routes` classes, `Resource` handler methods are `async` functions which receive a [koa context](http://koajs.com/#context) as their only argument.

*resources/person-resource.js*
```js
const inject = require('ravel').inject;
const Resource = require('ravel').Resource;
const before = Routes.before;

// you can inject your own Modules and npm dependencies into Resources
@inject('koa-bodyparser', 'fs', 'custom-module')
@Resource('/person') // base path for all routes in this class
class PersonResource {
  constructor(convert, bodyParser, fs, custom) {
    this.bodyParser = bodyParser(); // make bodyParser middleware available to @before within this class
    this.fs = fs;
    this.custom = custom;
  }

  // will map to GET /person
  @before('bodyParser') // use bodyParser middleware before handler
  async getAll (ctx) {
    // ctx is a koa context object.
    // await on Promises, and set ctx.body to create a body for response
    // "OK" status code will be chosen automatically unless configured via ctx.status
    // Extend and throw a Ravel.Error to send an error status code
  }

  // will map to GET /person/:id
  async get (ctx) {
    // can use ctx.params.id in here automatically
  }

  // will map to POST /person
  async post (ctx) {}

  // will map to PUT /person
  async putAll (ctx) {}

  // will map to PUT /person/:id
  async put (ctx) {}

  // will map to DELETE /person
  async deleteAll (ctx) {}

  // will map to DELETE /person/:id
  async delete (ctx) {}
}

module.exports = PersonResource;
```

#### Registering Resources
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Ravel#resources)

Much like `Module`s, `Resource`s can be added to your Ravel application via `app.scan('path/to/resources/directory')`:

*app.js*
```js
// ...
const app = new Ravel();
// directory scanning!
app.scan('./resources');
```

### Response Caching

Ravel supports transparent response caching via the `@cache` decorator, which can be applied at both the class and method-level of `Resource`s and `Routes`. Method-level applications of `@cache` override class-level ones.

*Method-level example*
```js
const Routes = require('ravel').Routes;
const mapping = Routes.mapping;
const cache = Routes.cache;

@Routes('/')
class MyRoutes {
  @cache // method-level version only applies to this route
  @mapping(Routes.GET, '/projects/:id')
  async handler (ctx) {
    // The response will automatically be cached when this handler is run
    // for the first time, and then will be served instead of running the
    // handler for as long as the cached response is available.
    // If this handler throws an exception, then that response will not be cached.
  }
}
```

*Class-level example, with options*
```js
const Resource = require('ravel').Resource;
const cache = Resource.cache;

// class-level version applies to all routes in class, overriding any
// method-level instances of the decorator.
@cache({expire:60, maxLength: 100}) // expire is measured in seconds. maxLength in bytes.
@Resource('/')
class MyResource {
  constructor (bodyParser) {
    this.bodyParser = bodyParser();
  }

  async get(ctx) {
    // The response will automatically be cached when this handler is run
    // for the first time, and then will be served instead of running the
    // handler for as long as the cached response is available (60 seconds).
  }
}
```

### Database Providers
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#databaseprovider)

A `DatabaseProvider` is a lightweight wrapper for a `node` database library (such as [node-mysql](https://github.com/felixge/node-mysql)) which performs all the complex set-up and configuration of the library automatically, and registers simple parameters which you must `app.set` (such as the database host ip). The true purpose of `DatabaseProvider`s is to reduce boilerplate code between applications, as well as facilitate Ravel's transaction-per-request system (coming up [next](#transaction-per-request)). You may use as many different `DatbaseProvider`s as you wish in your application. Here's an example pulled from [`ravel-mysql-provider`](https://github.com/raveljs/ravel-mysql-provider):

#### Example Setup

*app.js*
```javascript
const app = new require('ravel')();
const MySQLProvider = require('ravel-mysql-provider');
new MySQLProvider(app, 'mysql');
// ... other providers and parameters
(async () => {
  await app.init();
})();
// ... the rest of your Ravel app
```

#### Example Configuration

*.ravelrc.json*
```json
{
  "mysql options": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "a password",
    "database": "mydatabase",
    "idleTimeoutMillis": 5000,
    "connectionLimit": 10
  }
}
```

#### List of Ravel `DatabaseProvider`s

Ravel currently supports several `DatabaseProvider`s via external libraries.

 - [`ravel-mysql-provider`](https://github.com/raveljs/ravel-mysql-provider)
 - [`ravel-rethinkdb-provider`](https://github.com/raveljs/ravel-rethinkdb-provider)
 - [`ravel-neo4j-provider`](https://github.com/raveljs/ravel-neo4j-provider)

> If you've written a `DatabaseProvider` and would like to see it on this list, contact us or open an issue/PR against this README!

### Transaction-per-request
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#transaction)

The `@transaction` decorator is Ravel's way of automatically opening (and managing) database connections for a `Routes` or `Resource` handler method. It is available for import as `Routes.transaction` or `Resource.transaction`.

When used at the method-level, `@transaction` opens connections for that specific handler method. When used at the class-level, it open connections for all handler methods in that `Route` or `Resource` class.

Connections are available within the handler method as an object `ctx.transaction`, which contains connections as values and `DatabaseProvider` names as keys. Connections will be closed automatically when the endpoint responds (**do not close them yourself**), and will automatically roll-back changes if a `DatabaseProvider` supports it (generally a SQL-only feature).

*resources/person-resource.js*
```js
const Resource = require('ravel').Resource;
const transaction = Resource.transaction;

@Resource('/person')
class PersonResource {
  // maps to GET /person/:id
  @transaction('mysql') // this is the name exposed by ravel-mysql-provider
  async get (ctx) {
    // TIP: Don't write complex logic here. Pass ctx.transaction into
    // a Module function which returns a Promise! This example is
    // just for demonstration purposes.
    ctx.body = await new Promise((resolve, reject) => {
      // ctx.transaction.mysql is a https://github.com/felixge/node-mysql connection
      ctx.transaction.mysql.query('SELECT 1', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}
module.exports = PersonResource;
```

### Scoped Transactions
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#Module#db)

Sometimes, you may need to open a transaction outside of a code path triggered by an HTTP request. Good examples of this might include database initialization at application start-time, or logic triggered by a websocket connection. In these cases, a `Module` class can open a `scoped` transaction using the names of the DatabaseProviders you are interested in, and an `async` function (scope) in which to use the connections. Scoped transactions only exist for the scope of the `async` function and are automatically cleaned up at the end of the function. It is best to view `Module.$db.scoped()` as an identical mechanism to `@transaction`, behaving in exactly the same way, with a slightly different API:

*modules/database-initializer.js*
```js
const Module = require('ravel').Module;
const autoinject = require('ravel').autoinject;
const prelisten = Module.prelisten;

@Module('db-init')
@autoinject('$db','$log')
class DatabaseInitializer {
  @prelisten // trigger db init on application startup
  doDbInit (ctx) {
    const self = this;
    // specify one or more providers to open connections to, or none
    // to open connections to all known DatabaseProviders.
    this.$db.scoped('mysql', async function (ctx) {
      // this async function behaves like koa middleware,
      // so feel free to await on promises!
      await self.createTables(ctx.transaction.mysql);
      await self.insertRows(ctx.transaction.mysql);
      // notice that this.transaction is identical to ctx.transaction
      // from @transaction! It's just a hash of open, named connections
      // to the DatabaseProviders specified.
    }).catch((err) => {
      self.$log.error(err.stack);
      process.exit(1); // in this case, we might want to kill our app if db init fails!
    });
  }

  /**
   * @returns {Promise}
   */
  createTables (mysqlConnection) { /* ... */ }

  /**
   * @returns {Promise}
   */
  insertRows (mysqlConnection) { /* ... */ }
}

module.exports = DatabaseInitializer;
```

### Authentication Providers
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#authenticationprovider)

An `AuthenticationProvider` is a lightweight wrapper for a [Passport](https://github.com/jaredhanson/passport) provider library (such as [passport-github](https://github.com/jaredhanson/passport-github)) which performs all the complex set-up and configuration of the library automatically, and registers simple parameters which you must `app.set` (such as OAuth client ids and secrets). The purpose of `AuthenticationProvider`s is to reduce boilerplate code between applications, and simplify often complex `Passport` configuration code. You may use as many different `AuthenticationProvider`s as you wish in your application. Here's an example pulled from [`ravel-github-oauth2-provider`](https://github.com/raveljs/ravel-github-oauth2-provider):

#### Example Setup

*app.js*
```javascript
const app = new require('ravel')();
const GitHubProvider = require('ravel-github-oauth2-provider');
new GitHubProvider(app);
// ... other providers and parameters
(async () => {
  await app.init();
});
// ... the rest of your Ravel app
```

#### Example Configuration

*.ravelrc.json*
```json
{
  "github auth callback url" : "http://localhost:8080",
  "github auth path": "/auth/github",
  "github auth callback path": "/auth/github/callback",
  "github client id": "YOUR_CLIENT_ID",
  "github client secret" : "YOUR_CLIENT_SECRET"
}
```

You'll also need to implement an `@authconfig` module like this:

*modules/authconfig.js*
```js
'use strict';

const Ravel = require('ravel');
const inject = Ravel.inject;
const Module = Ravel.Module;
const authconfig = Module.authconfig;

@authconfig
@Module('authconfig')
@inject('user-profiles')
class AuthConfig {
  constructor (userProfiles) {
    this.userProfiles = userProfiles;
  }
  serializeUser (profile) {
    // serialize profile to session using the id field
    return Promise.resolve(profile.id);
  }
  deserializeUser (id) {
    // retrieve profile from database using id from session
    return this.userProfiles.getProfile(id); // a Promise
  }
  verify (providerName, ...args) {
    // this method is roughly equivalent to the Passport verify callback, but
    // supports multiple simultaneous AuthenticationProviders.
    // providerName is the name of the provider which needs credentials verified
    // args is an array containing credentials, such as username/password for
    // verification against your database, or a profile and OAuth tokens. See
    // specific AuthenticationProvider library READMEs for more information about
    // how to implement this method.
  }
}

module.exports = AuthConfig;
```

#### List of Ravel `AuthenticationProvider`s

Ravel currently supports several `AuthenticationProvider`s via external libraries.

 - [`ravel-github-oauth2-provider`](https://github.com/raveljs/ravel-github-oauth2-provider)
 - [`ravel-google-oauth2-provider`](https://github.com/raveljs/ravel-google-oauth2-provider)

> If you've written an `AuthenticationProvider` and would like to see it on this list, contact us or open an issue/PR against this README!

### Authentication
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#authenticated)

Once you've registered an `AuthenticationProvider`, requiring users to have an authenticated session to access a `Routes` or `Resource` endpoint is accomplished via the `@authenticated` decorator, which can be used at the class or method level:

*Note: the @authenticated decorator works the same way on `Routes` and `Resource` classes/methods*
```js
const Routes = require('ravel').Routes;
const mapping = Routes.mapping;
const authenticated = Routes.authenticated;

@authenticated // protect all endpoints in this Routes class
@Routes('/')
class MyRoutes {
  @authenticated({redirect: true}) // protect one endpoint specifically
  @mapping(Routes.GET, 'app')
  async handler (ctx) {
    // will redirect to app.get('login route') if not signed in
  }
}
```

### WebSockets
> [<small>View API docs &#128366;</small>](http://raveljs.github.io/docs/latest/index.html#websockets)

## Deployment and Scaling

Ravel is designed for horizontal scaling, and helps you avoid common pitfalls when designing your node.js backend application. In particular:

 - Session storage in [Redis](https://github.com/antirez/redis) is highly recommended. Without it, you cannot safely replicate your Ravel app. When deploying multiple replicas of your Ravel app, be sure to `app.set('redis host')` to point to an external, shared `redis` server.
 - The internal [koa](http://koajs.com/) application's `app.proxy` flag is set to `true`.
 - All Ravel dependencies are strictly locked (i.e. no use of `~` or `^` in `package.json`). This helps foster repeatability between members of your team, as well as between development/testing/production environments. Adherence to semver in the node ecosystem is unfortunately varied at best, so it is recommended that you follow the same practice in your app as well.
 - While it is possible to color outside the lines, Ravel provides a framework for developing **stateless** backend applications, where all stateful data is stored in external caches or databases.

It is strongly encouraged that you containerize your Ravel app using an [Alpine-based docker container](https://hub.docker.com/r/mhart/alpine-node/), and then explore technologies such as [docker-compose](https://www.docker.com/products/docker-compose) or [kubernetes](http://kubernetes.io/) to appropriately scale out and link to (at least) the [official redis container](https://hub.docker.com/_/redis/). An example project with a reference `docker-compose` environment for Ravel can be found in the [starter project](https://github.com/raveljs/ravel-github-mariadb-starter).

Ravel apps may either be TLS-terminated by the proxy in front of them, or communicate with that proxy over TLS via `app.set('https', true)`. When enabling `https` support, `app.get('port')` refers to the port which will now listen for `https` traffic. `app.set('https options', {})` may be used in conjunction with options from [here](https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener) to set keys, certificates, etc. Ravel _does not_ support exposing endpoints over `http` and `https` simultaneously, as it is recommended to exclusively use `https` via a terminating proxy or, if necessary, directly against the app.

Ravel does not explicitly require [hiredis](https://github.com/redis/hiredis-node), but is is highly recommended that you install it alongside Ravel for improved redis performance.

If you are looking for a good way to share `.ravelrc.json` configuration between multiple replicas of the same Ravel app, have a look at [ravel-etcd-config](https://github.com/raveljs/ravel-etcd-config) for easy distributed configuration.
