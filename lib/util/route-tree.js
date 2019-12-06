'use strict';

const pathToRegexp = require('path-to-regexp');
const compose = require('koa-compose');
const $err = require('./application_error');

const _component = new WeakMap();
const _componentPattern = new WeakMap();
const _componentKeys = new WeakMap();
const _children = new WeakMap();
const _catchAll = new WeakMap();
const _middleware = new WeakMap();
const _composedMiddleware = new WeakMap();

/**
 * HTTP Methods
 *
 * @private
 */
const Methods = {
  GET: 'GET',
  PATCH: 'PATCH',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
};

/**
 * The result of a RouteTree search.
 *
 * @private
 */
class RouteTreeResult {
  constructor (params, middleware, composedMiddleware) {
    this.params = params;
    this.middleware = middleware;
    this.composedMiddleware = composedMiddleware;
  }
}

/**
 * RouteTreeNode represents the root in a tree of routes which have been
 * decomposed into path components.
 *
 * @private
 */
class RouteTreeRoot {
  constructor () {
    this[Methods.GET] = new RouteTreeNode();
    this[Methods.PATCH] = new RouteTreeNode();
    this[Methods.POST] = new RouteTreeNode();
    this[Methods.PUT] = new RouteTreeNode();
    this[Methods.DELETE] = new RouteTreeNode();
  }

  /**
   * @private
   * @returns {string[]} - A list of methods supported by this RouteTree.
   */
  allowedMethods () {
    const methods = [];
    if (!this[Methods.GET].isEmpty) methods.push('GET');
    if (!this[Methods.PATCH].isEmpty) methods.push('PATCH');
    if (!this[Methods.POST].isEmpty) methods.push('POST');
    if (!this[Methods.PUT].isEmpty) methods.push('PUT');
    if (!this[Methods.DELETE].isEmpty) methods.push('DELETE');
    return methods;
  }

  /**
   * @private
   * @param {string} method - An HTTP verb
   * @returns {boolean} - True iff the route tree for the given method is non-empty
   */
  isSupported (method) {
    return this[method] !== undefined && !this[method].isEmpty;
  }

  /**
   * Adds a route to an existing route tree.
   *
   * @private
   * @param {string} method - The HTTP verb for this route
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   * @param {boolean} catchAll - If true, this route would consume all path components after those
   *                             explicitly specified (i.e., a catchall route /foo/:bar would match
   *                             /foo/bar and /foo/bar/car).
   * @throws {$err.IllegalValue} - If the method type is unsupported.
   * @throws {$err.DuplicateEntry} - If a functionally identical route already exists.
   */
  addRoute (method, pattern, middleware, catchAll = false) {
    if (this[method] === undefined) {
      throw new $err.IllegalValue(`Unsupported method type ${method}`);
    } else {
      const pathComponents = pattern.split('/').filter(e => e !== '');
      if (this[method].containsFunctionalDuplicate(pathComponents)) {
        throw new $err.DuplicateEntry(`Path ${pattern} has already been defined.`);
      }
      this[method].addRoute(pattern, pathComponents, middleware, catchAll);
    }
  }

  /**
   * Sorts the subtree rooted at this node so that routes are
   * chosen deterministically, rather than being subject to
   * declaration order.
   *
   * @private
   */
  sort () {
    this[Methods.GET].sort();
    this[Methods.PATCH].sort();
    this[Methods.POST].sort();
    this[Methods.PUT].sort();
    this[Methods.DELETE].sort();
  }

  /**
   * Matches a path to the route tree, returning the middleware
   * which should be executed for the given path, along with
   * path parameter values.
   *
   * @param {string} method - The HTTP method to match against (i.e. Methods.GET).
   * @param {string} path - The string path to match against.
   * @returns {RouteTreeResult} - The resulting match from the tree, or null if none was found.
   */
  match (method, path) {
    if (!this.isSupported(method)) {
      throw new $err.IllegalValue(`Unsupported method type ${method}`);
    }
    return this[method].match(path.split('/'));
  }
}

/**
 * RouteTreeNode represents a node in a tree of routes which have been
 * decomposed into path components.
 *
 * @private
 */
class RouteTreeNode {
  constructor (component, componentPattern, componentKeys) {
    _component.set(this, component);
    _componentPattern.set(this, componentPattern);
    _componentKeys.set(this, componentKeys);
    _children.set(this, []);
    _catchAll.set(this, false);
    _middleware.set(this, []);
  }

  /**
   * Compares two nodes for sorting purposes.
   * Based on this excellent comment: https://github.com/ZijianHe/koa-router/issues/231#issuecomment-302647028
   *
   * @private
   * @param {RouteTreeNode} lNode - The left node.
   * @param {RouteTreeNode} rNode - The right node.
   * @returns {boolean} true, iff lNode <= rNode
   */
  static compare (lNode, rNode) {
    // catch-all routes have the lowest priority
    if (!lNode.catchAll && rNode.catchAll) {
      return -1;
    } else if (lNode.catchAll && !rNode.catchAll) {
      return 1;
    }

    // no parameters (/hello) is higher priority than routes with parameters
    if (lNode.componentKeys.length === 0 && rNode.componentKeys.length > 0) {
      return -1;
    } else if (lNode.componentKeys.length > 0 && rNode.componentKeys.length === 0) {
      return 1;
    } else if (lNode.componentKeys.length === 0 && rNode.componentKeys.length === 0) {
      // lNode and rNode do not have keys/parameters
      return 0;
    }

    // lNode and rNode have keys/parameters, so non-optional wins (/:hello+ or /:hello)
    const lComponent = lNode.componentKeys[0];
    const rComponent = rNode.componentKeys[0];
    if (!lComponent.optional && rComponent.optional) {
      return -1;
    } else if (lComponent.optional && !rComponent.optional) {
      return 1;
    }

    // both are or are not optional, so prefixed parameters (/ab:hello) win over non-prefixed
    if (lComponent.prefix.length > 0 && rComponent.prefix.length === 0) {
      return -1;
    } else if (lComponent.prefix.length === 0 && rComponent.prefix.length > 0) {
      return 1;
    }

    // we have no other basis for comparison, so fall back to declaration order
    return 0;
  }

  get children () {
    return _children.get(this);
  }

  get catchAll () {
    return _catchAll.get(this);
  }

  get component () {
    return _component.get(this);
  }

  get componentPattern () {
    return _componentPattern.get(this);
  }

  get componentKeys () {
    return _componentKeys.get(this);
  }

  get middleware () {
    return _middleware.get(this);
  }

  get composedMiddleware () {
    return _composedMiddleware.get(this);
  }

  get isEmpty () {
    return this.children.length === 0 && this.middleware.length === 0;
  }

  /**
   * Checks if a route is functionally identical to one already declared in the tree (even if key names differ).
   *
   * @private
   * @param {string[]} pathComponents - An array of components derived from the path (splitting on '/').
   * @param {boolean} catchAll - If true, this route would consume all path components after those
   *                             explicitly specified (i.e., a catchall route /foo/:bar would match
   *                             /foo/bar and /foo/bar/car).
   * @returns {boolean} - True iff the route represented by pathComponents is functionally identical
   *                      to one already in this RouteTree
   */
  containsFunctionalDuplicate (pathComponents, catchAll = false) {
    if (pathComponents.length === 0) {
      // if there's no path components to begin with, then this is only a
      // duplicate if we've stored middleware at the "root" path (/)
      // if we reached here via recursion, the same test works.
      return this.middleware.length > 0 || catchAll;
    } else {
      const componentPattern = pathToRegexp(pathComponents[0], []);
      const rest = pathComponents.slice(1);
      for (const child of this.children) {
        if (child.componentPattern.toString() === componentPattern.toString()) {
          const match = child.containsFunctionalDuplicate(rest);
          if (match) return true;
          // otherwise, check next branch
        }
      }
      return false;
    }
  }

  /**
   * Adds a route to an existing route tree.
   *
   * @private
   * @param {string} pattern - The original path, used in error messages.
   * @param {string[]} pathComponents - An array of components derived from the path (splitting on '/').
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   * @param {boolean} catchAll - If true, this route will consume all path components after those
   *                             explicitly specified (i.e., a catchall route /foo/:bar would match
   *                             /foo/bar and /foo/bar/car).
   */
  addRoute (pattern, pathComponents, middleware, catchAll = false) {
    // check if we're done
    if (pathComponents.length === 0) {
      _middleware.set(this, middleware);
      _composedMiddleware.set(this, compose(middleware));
      _catchAll.set(this, catchAll);
      return; // done!
    }
    const componentKeys = [];
    const componentPattern = pathToRegexp(pathComponents[0], componentKeys);
    if (componentKeys.reduce((p, c) => p || c.repeat, false)) {
      throw new $err.IllegalValue(`Repeated path components (${pathComponents[0]}) are not supported.`);
    }
    // check if an existing child has an identical pathComponent to the current one
    // we know we won't find a functionally matching route because that's already been checked.
    for (const child of this.children) {
      if ((child.component === pathComponents[0] &&
        child.componentPattern.toString() === componentPattern.toString()) || (child.catchAll && catchAll)) {
        return child.addRoute(pattern, pathComponents.slice(1), middleware, catchAll);
      }
    }
    // If not, create node and recurse
    const newNode = new RouteTreeNode(pathComponents[0], componentPattern, componentKeys);
    this.children.push(newNode);
    return newNode.addRoute(pattern, pathComponents.slice(1), middleware, catchAll);
  }

  /**
   * Sorts the subtree rooted at this node so that routes are
   * chosen deterministically, rather than being subject to
   * declaration order.
   *
   * @private
   */
  sort () {
    this.children.sort(RouteTreeNode.compare);
    for (const child of this.children) {
      child.sort();
    }
  }

  /**
   * Matches a path to the route tree, returning the middleware
   * which should be executed for the given path, along with
   * path parameter values.
   *
   * @private
   * @param {string[]} path - The path components to match against.
   * @param {object} keyValues - The values of any path parameters present in the path.
   * @returns {RouteTreeResult} - The resulting match from the tree, or null if none was found.
   */
  match (path, keyValues = {}) {
    if (path.length === 0) {
      if (this.middleware.length > 0) {
        return new RouteTreeResult(keyValues, this.middleware, this.composedMiddleware);
      } else {
        return null;
      }
    } else if (path[0].length === 0) {
      // skip any empty path segments
      return this.match(path.slice(1), keyValues);
    }
    const currComponent = path[0];
    const rest = path.slice(1);
    for (const child of this.children) {
      const match = currComponent.match(child.componentPattern);
      if (match === null) {
        continue; // try next child
      }
      // recurse if necessary
      if (rest.length > 0) {
        const childMatch = child.match(rest, keyValues);
        if (childMatch !== null) {
          // if the branch matched, fill in our matching values too
          child.componentKeys.forEach((k, idx) => {
            keyValues[k.name] = match[idx + 1];
          });
          return childMatch;
        }
        // if we didn't find a match in that branch, continue searching other branches
        continue;
      } else if (child.catchAll || child.middleware.length > 0) {
        // we've no more components to look through, and we've hit a
        // node with middleware, so fill in our matching values
        child.componentKeys.forEach((k, idx) => {
          keyValues[k.name] = match[idx + 1];
        });
        // otherwise, return the result
        return new RouteTreeResult(keyValues, child.middleware, child.composedMiddleware);
      } else {
        // we didn't hit a terminal node
        continue;
      }
    }
    // finally, check if we're a catch-all node
    if (this.catchAll && this.middleware.length > 0) {
      return new RouteTreeResult(keyValues, this.middleware, this.composedMiddleware);
    }
    // if we made it here, no child matched currComponent
    return null;
  }
}

module.exports.Methods = Methods;

module.exports.RouteTreeNode = RouteTreeNode;

module.exports.RouteTreeRoot = RouteTreeRoot;
