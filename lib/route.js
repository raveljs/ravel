'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Provides Ravel with a simple mechanism of registering
 * ExpressJS routes, which should generally only be used
 * for serving templated pages or static content (not 
 * for building RESTful APIs, for which Ravel.resource
 * is more applicable). Thus, these routes are restricted
 * to GET-only requests.
 */

 var path = require('path');

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
      throw new Ravel.ApplicationError.DuplicateEntry('Route module \'' + routeModulePath + '\' has already been registered.');
    }
    var routes = {
      _routes: []
    };    
    var routeBuilder = {
      private: function() {
        return {
          add: function(route, middleware) {
            routes._routes.push({
              isSecure:true,
              route:route,
              middleware:middleware
            });
          }
        };
      },
      public: function() {
        return {
          add: function(route, middleware) {
            routes._routes.push({
              isSecure:false,
              route:route,
              middleware:middleware
            });
          }
        };
      }
    };
    //This will be run in Ravel.start
    routesFactories[routeModulePath] = function(expressApp) {
      injector.inject({
        '$L': require('./log')(routeModulePath),
        '$RouteBuilder': routeBuilder,
        '$Broadcast': Ravel.broadcast,
        '$KV': Ravel.kvstore
      }, require(path.join(Ravel.cwd, routeModulePath)));
      for (var rk=0;rk<routes._routes.length;rk++) {
        if (routes._routes[rk].isSecure) {          
          expressApp.get(routes._routes[rk].route, Ravel.authorize, routes._routes[rk].middleware);
          Ravel.Log.i('Registering secure route GET ' + routes._routes[rk].route);
        } else {
          expressApp.get(routes._routes[rk].route, routes._routes[rk].middleware);
          Ravel.Log.i('Registering public route GET ' + routes._routes[rk].route);
        }
      }
    };
  };
};