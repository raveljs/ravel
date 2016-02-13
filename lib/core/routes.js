'use strict';

/**
 * Provides Ravel with a simple mechanism of registering
 * Koa routes, which should generally only be used
 * for serving templated pages or static content (not
 * for building RESTful APIs, for which Ravel.resource
 * is more applicable). Thus, these routes are restricted
 * to GET-only requests.
 */

const upath = require('upath');
const symbols = require('./symbols');
const utilSymbols = require('../util/symbols');

// process all methods and add to koa app
const buildRoute = function(ravelInstance, routes, koaRouter, proto, methodName) {
  const method = methodName.substring(10);
  const path = proto[`_path_${method}`];
  const fullPath = upath.join(routes.basePath, path);

  ravelInstance.Log.info(`Registering route GET ${fullPath}`);

  let args = [fullPath];

  //get middleware by calling appropriate method on resource object
  const middleware = [];
  let toInject = routes[utilSymbols.beforeMethodMiddleware][method];

  //apply class-level @pre middleware, if any
  if (routes[utilSymbols.beforeGlobalMiddleware] && Array.isArray(routes[utilSymbols.beforeGlobalMiddleware])) {
    toInject = routes[utilSymbols.beforeGlobalMiddleware].concat(toInject);
  }

  for (let i=0; i<toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  //finally push actual function methodName
  middleware.push(routes[methodName]);

  args = args.concat(middleware);

  // now call underlying koa method to register middleware at specific route
  koaRouter.get.apply(koaRouter, args);
};

/**
 * A superclass extended to create a Ravel Routes module
 */
class Routes {
  /**
   * Decorator for setting the relative path of a method within a Route
   */
  static mapping(path) {
    return function(target, key, descriptor) {
      target[`_path_${key}`] = path;
      delete target[key];
      target[`_endpoint_${key}`] = descriptor.value;
    };
  }

  constructor(basePath) {
    this.basePath = upath.normalize(basePath || '');
  }

  _init(ravelInstance, koaRouter) { //eslint-disable-line no-unused-vars
    this.log = ravelInstance.Log.getLogger(typeof this);
    const proto = Object.getPrototypeOf(this);
    const methods = Object.keys(proto).filter((e) => e.indexOf('_endpoint') >= 0);
    for (let r of methods) {
      buildRoute(ravelInstance, this, koaRouter, proto, r);
    }
  }
}

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
          const routes = this[symbols.injector].inject({
            '$E': this.ApplicationError,
            '$KV': this.kvstore,
            '$Private': this.authorize,
            '$PrivateRedirect': this.authorizeWithRedirect
          }, routesClass);
          routes._init(this, koaRouter);
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
   * @param app koaApp
   */
  Ravel.prototype[symbols.routesInit] = function(koaRouter) {
    for (let r of Object.keys(this[symbols.routesFactories])) {
      this[symbols.routesFactories][r](koaRouter);
    }
  };
};
