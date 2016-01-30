'use strict';

/**
 * Provides Ravel with a simple mechanism of registering
 * ExpressJS routes, which should generally only be used
 * for serving templated pages or static content (not
 * for building RESTful APIs, for which Ravel.resource
 * is more applicable). Thus, these routes are restricted
 * to GET-only requests.
 */

const upath = require('upath');

// process all methods and add to express app
const buildRoute = function(ravelInstance, routes, app, proto, methodName) {
  const method = methodName.substring(10);
  const path = proto[`_path_${method}`];
  const fullPath = upath.join(routes.basePath, path);

  ravelInstance.Log.info(`Registering route GET ${fullPath}`);

  let args = [fullPath];

  //get middleware by calling appropriate method on resource object
  const middleware = [];
  let toInject = routes[`_middleware_${method}`];

  //apply class-level @pre middleware, if any
  if (routes._globalMiddleware && Array.isArray(routes._globalMiddleware)) {
    toInject = routes._globalMiddleware.concat(toInject);
  }

  for (let i=0; i<toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance._injector.getModule(routes, m));
  }

  //finally push actual function methodName
  middleware.push(routes[methodName]);

  args = args.concat(middleware);

  // now call underlying express method to register middleware at specific route
  app.get.apply(app, args);
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

  _init(ravelInstance, app) { //eslint-disable-line no-unused-vars
    this.log = ravelInstance.Log.getLogger(typeof this);
    const proto = Object.getPrototypeOf(this);
    const methods = Object.keys(proto).filter((e) => e.indexOf('_endpoint') >= 0);
    for (let r of methods) {
      buildRoute(ravelInstance, this, app, proto, r);
    }
  }
}

module.exports = function(Ravel) {

  // Make Routes class available statically for extension
  Ravel.Routes = Routes;

  /**
   * Register a bunch of plain GET express middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given
   * base path.
   *
   * @param {String} directoryModulePath the path of the directory module to require(...)
   */
  Ravel.prototype.routes = function(routeModulePath) {
    //if a module with this name has already been regsitered, error out
    if (this._routesFactories[routeModulePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Route module \'${routeModulePath}\' has already been registered.`);
    }

    const routesClass = require(upath.join(this.cwd, routeModulePath));
    if (routesClass.prototype instanceof Routes) {
      //This will be run in Ravel.start
      this._routesFactories[routeModulePath] = (app) => {
          const routes = this._injector.inject({
            '$E': this.ApplicationError,
            '$KV': this.kvstore,
            '$Private': this.authorize,
            '$PrivateRedirect': this.authorizeWithRedirect
          }, routesClass);
          routes._init(this, app);
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
   * @param app expressApp
   */
  Ravel.prototype._routesInit = function(app) {
    for (let r of Object.keys(this._routesFactories)) {
      this._routesFactories[r](app);
    }
  };
};
