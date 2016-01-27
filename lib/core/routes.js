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

/**
 * A superclass extended to create a Ravel Routes module
 */
class Routes {
  constructor(basePath) {
    this.basePath = upath.normalize(basePath || '');
    this._routes = [];
  }

  get(route, ...middleware) {
    this._routes.push({
      route:route,
      middleware:middleware
    });
  }

  _init(Ravel, app) {
    this.log = Ravel.Log.getLogger(typeof this);
    for (let r of this._routes) {
      Ravel.Log.info('Registering route GET ' + r.route);
      const args = [upath.join(this.basePath, r.route)].concat(r.middleware);
      app.get.apply(app, args);
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
            '$Broadcast': this.broadcast,
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
    for (let r of Ravel._routesFactories) {
      r(app);
    }
  };
};
