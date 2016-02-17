# Ravel
[![npm version](https://badge.fury.io/js/ravel.svg)](http://badge.fury.io/js/ravel) [![Build Status](https://travis-ci.org/raveljs/ravel.svg?branch=master)](https://travis-ci.org/raveljs/ravel) [![Coverage Status](https://coveralls.io/repos/raveljs/ravel/badge.svg?branch=master)](https://coveralls.io/r/raveljs/ravel?branch=master) [![Dependency Status](https://david-dm.org/raveljs/ravel.svg)](https://david-dm.org/raveljs/ravel)

Forge past a tangle of node.js code. Make a cool app.

## Introduction

Ravel is a tiny, sometimes-opinionated foundation for rapidly creating maintainable, horizontally-scalable web application back-ends in  [node](https://github.com/joyent/node).

Layered on top of ES2015/2016 and awesome technologies such as [koa](http://koajs.com/), [babel](babeljs.io), [Passport](https://github.com/jaredhanson/passport), [Intel](https://github.com/seanmonstar/intel), [Redis](https://github.com/antirez/redis), and [docker](docker.com), Ravel aims to provide a pre-baked, well-tested and highly modular solution for constructing enterprise web applications by providing:

 - A standard set of well-defined architectural components
 - Dependency injection
 - Automatic transaction-per-request management
 - Authentication and authorization with transparent handling of mobile (i.e. non-web) clients
 - Rapid, standards-compliant REST API definition
 - Easy bootstrapping, via an enforced, reference configuration of [koa](http://koajs.com/) and standard middleware
 - Horizontal scalability

## Installation

    $ npm install ravel

Ravel needs [Redis](https://github.com/antirez/redis) to run. As part of the Ravel 1.0 release, a reference project including a [docker](docker.com)ized development environment will be provided as a [Yeoman](http://yeoman.io/) generator, but for now you'll need to install Redis somewhere yourself.

## Ravel Architecture

Ravel applications consist of three basic parts:

### Modules

Plain old node.js modules containing a class which encapsulates application logic. Modules support dependency injection of core Ravel services and other Modules alongside npm dependencies *(no relative `require`'s!)*. Modules are instantiated safely in dependency-order, and cyclical dependencies are detected automatically.

*modules/cities.js*
```javascript
const Module = require('ravel').Module;
const inject = require('ravel').inject;
const c = ['Toronto', 'New York', 'Chicago']; // fake 'database'

@inject('async')
class Cities extends Module {
  constructor(async) {
    super();
    this.async = async;
  }

  getAllCities() {
    return Promise.resolve(c);
  }

  getCity(name) {
    return new Promise((resolve, reject) => {
      const index = c.indexOf(name);
      if (index) {
        resolve(c[index]);
      } else {
        this.log.warn(`User requested unknown city ${name}`);
        // reject the promise with a Ravel error, and
        // Ravel will automatically respond with the
        // appropriate HTTP status code! Feel free to
        // implement your own errors as well via Ravel.error(name, code).
        reject(new this.ApplicationError.NotFound(`City ${name} does not exist.`));
      }
    });
  }
}
```

### Resources

What might be referred to as a *controller* in other frameworks, a Resource module defines HTTP methods on an endpoint, supporting the session-per-request transaction pattern via Ravel middleware. Also supports dependency injection, allowing for the easy creation of RESTful interfaces to your Module-based application logic.

*resources/city.js*
```javascript
// Resources support dependency injection too!
// Notice that we have injected our cities Module by name.
const Resource = require('ravel').Resource;
const inject = require('ravel').inject;
const before = Resource.before; // decorator to add middleware to an endpoint within the Resource

@inject('cities')
class CitiesResource extends Resource {
  constructor(cities) {
    super('/cities');
    this.cities = cities;

    // some other middleware, which you might have injected or created here
    this.anotherMiddleware = function*(next) {
      yield next;
    };
  }

  @before('respond') // 'respond' is built-in Ravel rest response middleware
  getAll(ctx) {   // ctx is a koa context. this is the last middleware which will run in the chain
     return this.cities.getAllCities()
     .then((list) => {
       ctx.body = list;
     });
  }

  @before('anotherMiddleware', 'respond')
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

  // postAll is not supported, because that's stupid.
}
```

### Routes

Only supporting GET requests, Routes are used to serve up content such as EJS/Jade templates. Everything else should be a Resource.

*routes/index.js*
```javascript
const Routes = require('ravel').Routes;
const mapping = Routes.mapping;
class ExampleRoutes extends Routes {
  @mapping('/app')
  appHandler(ctx) {
    ctx.body = '<!DOCTYPE html><html>...</html>';
    ctx.status = 200;
  }
}
```

### Bringing it all together

*app.js*
```javascript
const app = new require('ravel')();

// parameters like this can be supplied via a .ravelrc file
app.set('keygrip keys', ['mysecret']);

app.modules('./modules'); //import all modules from a directory
app.resources('./resources');  //import all resources from a directory
app.routes('./routes/index.js');  //import all routes from a file

// start it up!
app.start();
```

## A more complex example

*"You mentioned transactions! Authentication and authorization! Mobile-ready APIs! Get on with the show, already!" --Some Impatient Guy*

TODO

## API Reference

TODO

## Deploying and Scaling Ravel Applications

TODO
