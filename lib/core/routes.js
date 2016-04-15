'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const utilSymbols = require('../util/symbols');

const sInit = Symbol('_init');

// process all methods and add to koa app
const buildRoute = function(ravelInstance, routes, koaRouter, meta) {
  const fullPath = upath.join(routes.basePath, meta.path);

  let verb;
  switch(meta.verb) {
    case symbols.PUT:
      verb = 'put';
      break;
    case symbols.POST:
      verb = 'post';
      break;
    case symbols.DELETE:
      verb = 'delete';
      break;
    default:
      verb = 'get';
  }

  ravelInstance.Log.info(`Registering route ${verb} ${fullPath}`);

  let args = [fullPath];

  //get middleware by calling appropriate method on routes object
  const middleware = [];
  let toInject = routes[utilSymbols.beforeMethodMiddleware] &&
                  routes[utilSymbols.beforeMethodMiddleware][meta.name] ?
                    routes[utilSymbols.beforeMethodMiddleware][meta.name] : [];

  //apply class-level @before middleware, if any
  if (routes[utilSymbols.beforeGlobalMiddleware] && Array.isArray(routes[utilSymbols.beforeGlobalMiddleware])) {
    toInject = routes[utilSymbols.beforeGlobalMiddleware].concat(toInject);
  }

  for (let i=0; i<toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  //finally push actual function methodName, but wrap it with a generator
  middleware.push(function*(next) {
    const result = meta.endpoint(this);
    // yield promises, so that exceptions can be caught properly
    if (result instanceof Promise) {
      yield result;
    }
    yield next;
  });

  args = args.concat(middleware);
  // now call underlying koa method to register middleware at specific route
  koaRouter[verb](...args);
};


/**
 * Provides Ravel with a simple mechanism of registering
 * Koa routes, which should generally only be used
 * for serving templated pages or static content (not
 * for building RESTful APIs, for which Ravel.Resource
 * is more applicable). Clients will extend this abstract
 * superclass to create a Routes module.
 */
class Routes {
  /**
   * Decorator for setting the relative path of a method within a Route
   */
  static mapping(verb, path) {
    return function(target, key, descriptor) {
      if (typeof target[symbols.meta] !== 'object') {
        target[symbols.meta] = Object.create(null);
      }
      target[symbols.meta][key] = {
        name: key,
        verb: verb,
        path: path,
        endpoint: descriptor.value
      };
      // delete target[key];
    };
  }

  static get GET() { return symbols.GET; }
  static get POST() { return symbols.POST; }
  static get PUT() { return symbols.PUT; }
  static get DELETE() { return symbols.DELETE; }

  constructor(basePath) {
    this.basePath = upath.normalize(basePath || '/');
  }
}
Routes.prototype[sInit] = function(ravelInstance, koaRouter) {
  this.log = ravelInstance.Log.getLogger(this.constructor.name);
  this.ApplicationError = ravelInstance.ApplicationError;
  this.kvstore = ravelInstance.kvstore;
  this.params = {
    get: ravelInstance.get
  };
  const meta = Object.getPrototypeOf(this)[symbols.meta] ? Object.getPrototypeOf(this)[symbols.meta] : {};
  const methods = Object.keys(meta);
  for (let r of methods) {
    buildRoute(ravelInstance, this, koaRouter, meta[r]);
  }
};

// add in @before decorator as static property
require('../util/before')(Routes);

module.exports = function(Ravel) {

  // Make Routes class available statically for extension
  Ravel.Routes = Routes;

  /**
   * Register a bunch of plain GET koa middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given
   * base path.
   *
   * @param {String} directoryModulePath the path of the directory module to require(...)
   */
  Ravel.prototype.routes = function(routeModulePath) {
    //if a module with this name has already been regsitered, error out
    if (this[symbols.routesFactories][routeModulePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Route module \'${routeModulePath}\' has already been registered.`);
    }

    const routesClass = require(upath.join(this.cwd, routeModulePath));
    if (routesClass.prototype instanceof Routes) {
      //This will be run in Ravel.start
      this[symbols.routesFactories][routeModulePath] = (koaRouter) => {
          const routes = this[symbols.injector].inject({}, routesClass);
          routes[sInit](this, koaRouter);
          return routes;
      };
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Routes Module with path ${routeModulePath} must be a subclass of Ravel.Routes`);
    }
  };

  /**
   * Performs routes initialization, executing routes factories
   * in dependency order in Ravel.init()
   *
   * @param router koa router
   */
  Ravel.prototype[symbols.routesInit] = function(router) {
    for (let r of Object.keys(this[symbols.routesFactories])) {
      this[symbols.routesFactories][r](router);
    }
  };
};

// mix class into exports so other classes can subclass it
module.exports.Routes = Routes;
