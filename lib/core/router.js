'use strict';

const { RouteTreeRoot, RouteTreeNode, Methods } = require('../util/route-tree');

const sRouteTree = Symbol.for('_routeTree');

/**
 * Router for Ravel. A deterministic router which allows for routing
 * that takes place independent of route declaration order.
 *
 * @private
 */
class Router {
  /**
   * Constructs a new Router for Ravel.
   */
  constructor () {
    this[sRouteTree] = new RouteTreeRoot(); // TODO
  }

  /**
   * Define a new GET route
   *
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  get (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.GET, pattern, middleware);
  }

  /**
   * Define a new PATCH route
   *
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  patch (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.PATCH, pattern, middleware);
  }

  /**
   * Define a new POST route
   *
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  post (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.POST, pattern, middleware);
  }

  /**
   * Define a new PUT route
   *
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  put (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.PUT, pattern, middleware);
  }

  /**
   * Define a new DELETE route
   *
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  delete (pattern, ...middleware) {
    this[sRouteTree].addRoute(Methods.DELETE, pattern, middleware);
  }

  /**
   * Construct and return routing middleware
   */
  routes() {

  }

  allowedMethods() {

  }
}

module.exports = Router;
