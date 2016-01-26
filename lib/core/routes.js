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

module.exports = function(Ravel, routesFactories, injector) {
  /**
   * Register a bunch of plain GET express middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given
   * base path.
   *
   * @param {String} directoryModulePath the path of the directory module to require(...)
   */
  Ravel.routes = function(routeModulePath) {
    //if a module with this name has already been regsitered, error out
    if (routesFactories[routeModulePath]) {
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Route module \'' + routeModulePath + '\' has already been registered.');
    }
    const routes = {
      _routes: []
    };
    const routeBuilder = {
      add: function(route /*, middleware...*/) {
        routes._routes.push({
          route:route,
          middleware:Array.prototype.slice.call(arguments, 1)
        });
      }
    };
    //This will be run in Ravel.start
    routesFactories[routeModulePath] = function(expressApp) {
      injector.inject({
        '$L': Ravel.Log.getLogger(routeModulePath),
        '$RouteBuilder': routeBuilder,
        '$Broadcast': Ravel.broadcast,
        '$KV': Ravel.kvstore,
        '$Private': Ravel.authorize,
        '$PrivateRedirect': Ravel.authorizeWithRedirect
      }, require(upath.join(Ravel.cwd, routeModulePath)));
      for (let rk=0;rk<routes._routes.length;rk++) {
        Ravel.Log.info('Registering route GET ' + routes._routes[rk].route);
        const args = [routes._routes[rk].route].concat(routes._routes[rk].middleware);
        expressApp.get.apply(expressApp, args);
      }
    };
  };
};
