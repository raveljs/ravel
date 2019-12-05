'use strict';

const { RouteTreeRoot, Methods } = require('../util/route-tree');
const $err = require('../util/application_error');

const sRouteTree = Symbol.for('_routeTree');

/**
 * Internal router for Ravel. A deterministic router which allows for routing
 * that takes place independent of route declaration order.
 *
 * @private
 */
class Router {
  /**
   * Constructs a new Router for Ravel.
   *
   * @private
   */
  constructor () {
    this[sRouteTree] = new RouteTreeRoot();
  }

  /**
   * Define a new GET route
   *
   * @private
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  get (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.GET, pattern, middleware);
  }

  /**
   * Define a new PATCH route
   *
   * @private
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  patch (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.PATCH, pattern, middleware);
  }

  /**
   * Define a new POST route
   *
   * @private
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  post (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.POST, pattern, middleware);
  }

  /**
   * Define a new PUT route
   *
   * @private
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  put (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.PUT, pattern, middleware);
  }

  /**
   * Define a new DELETE route
   *
   * @private
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  delete (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.DELETE, pattern, middleware);
  }

  /**
   * Define a new catch-all route
   *
   * @private
   * @param {string} method - GET/POST/PUT/PATCH/DELETE.
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  catchAll (method, pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods[method], pattern, middleware, true);
  }

  /**
   * Construct and return routing middleware
   *
   * @private
   * @returns {AsyncFunction} - Koa-compatible routing middleware.
   */
  middleware () {
    this[sRouteTree].sort();
    return async (ctx, next) => {
      if (ctx.method === 'OPTIONS') {
        ctx.status = 200;
        ctx.set('Allow', ['OPTIONS', ...this[sRouteTree].allowedMethods()].join(', '));
      } else {
        let match;
        // try to find a match to the request url
        try {
          match = this[sRouteTree].match(ctx.method, ctx.url);
          if (match === null) {
            ctx.throw(404);
            return;
          }
        } catch (err) {
          if (err instanceof $err.IllegalValue) {
            ctx.status = 405;
            ctx.set('Allow', ['OPTIONS', ...this[sRouteTree].allowedMethods()].join(', '));
            return;
          } else {
            throw err;
          }
        }
        // otherwise, run the matching middleware
        ctx.params = match.params;
        await match.composedMiddleware(ctx, next);
      }
    };
  }
}

module.exports = Router;
