'use strict';

const pathToRegexp = require('path-to-regexp');
const $err = require('./application_error');

const _component = new WeakMap();
const _componentPattern = new WeakMap();
const _componentKeys = new WeakMap();
const _children = new WeakMap();
const _middleware = new WeakMap();

/**
 * HTTP Methods
 *
 * @private
 */
class Methods {
  static get GET () { return Symbol.for('GET'); }

  static get PATCH () { return Symbol.for('PATCH'); }

  static get POST () { return Symbol.for('POST'); }

  static get PUT () { return Symbol.for('PUT'); }

  static get DELETE () { return Symbol.for('DELETE'); }
}

/**
 * The result of a RouteTree search.
 *
 * @private
 */
class RouteTreeResult {
  constructor (params, middleware) {
    this.params = params;
    this.middleware = middleware;
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
   * Adds a route to an existing route tree.
   *
   * @private
   * @param {symbol} method - The HTTP verb for this route
   * @param {string} pattern - The matching pattern for this route.
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  addRoute (method, pattern, middleware) {
    if (this[method] === undefined) {
      throw new $err.IllegalValue(`Unsupported method type ${method}`);
    } else {
      const pathComponents = pattern.split('/');
      this[method].addRoute(pattern, pathComponents, middleware);
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
   * @param {symbol} method - The HTTP method to match against (i.e. Methods.GET).
   * @param {string} path - The string path to match against.
   * @returns {RouteTreeResult} - The resulting match from the tree, or null if none was found.
   */
  match (method, path) {
    if (this[method] === undefined) {
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
    // no parameters (/hello) is highest priority
    if (lNode.componentKeys.length === 0 && rNode.componentKeys.length > 0) {
      return lNode;
    } else if (lNode.componentKeys.length > 0 && rNode.componentKeys.length === 0) {
      return rNode;
    } else if (lNode.componentKeys.length === 0 && rNode.componentKeys.length === 0) {
      // lNode and rNode do not have keys/parameters
      return lNode;
    } else {
      // lNode and rNode have keys/parameters
      const lComponent = lNode.componentKeys[0];
      const rComponent = rNode.componentKeys[0];
      // then, non-repeated parameters (/:hello) should win over repeated ones (/:hello* or /:hello+)
      if (!lComponent.repeat && rComponent.repeat) {
        return lNode;
      } else if (lComponent.repeat && !rComponent.repeat) {
        return rNode;
      } else {
        // both are or are not repeated, so non-optional wins (/:hello+ or /:hello)
        if (!lComponent.optional && rComponent.optional) {
          return lNode;
        } else if (lComponent.optional && !rComponent.optional) {
          return rNode;
        } else {
          // both are or are not optional, so prefixed parameters (/ab:hello) win over non-prefixed
          if (lComponent.prefix.length > 0 && rComponent.prefix.length === 0) {
            return lNode;
          } else if (lComponent.prefix.length === 0 && rComponent.prefix.length > 0) {
            return rNode;
          } else {
            // identical priority, so left wins. optional non-prefixed wildcard (/:hello*) has lowest priority
            return lNode;
          }
        }
      }
    }
  }

  get children () {
    return _children.get(this);
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

  /**
   * Adds a route to an existing route tree.
   *
   * @private
   * @param {string} pattern - The original path, used in error messages.
   * @param {string[]} pathComponents - An array of components derived from the path (splitting on '/').
   * @param {AsyncFunction[]} middleware - One or more middleware functions to attach to this route
   */
  addRoute (pattern, pathComponents, middleware) {
    // check if we're done
    if (pathComponents.length === 0) {
      _middleware.set(this, middleware);
      return; // done!
    } else if (pathComponents[0].length === 0) {
      return this.addRoute(pattern, pathComponents.slice(1), middleware);
    }
    const componentKeys = [];
    const componentPattern = pathToRegexp(pathComponents[0], componentKeys);
    if (componentKeys.length > 1) {
      throw new $err.IllegalValue(`Path component ${pathComponents[0]} contains more than one key.`);
    }
    // check if an existing child has the first pathComponent
    for (const child of this.children) {
      if (child.componentPattern.toString() === componentPattern.toString()) {
        // If so, and there are no more components, throw an error for duplication
        if (pathComponents.length === 1) {
          throw new $err.DuplicateEntry(`Path ${pattern} has already been defined.`);
        } else {
          // If so, and there are more components, recurse
          return child.addRoute(pattern, pathComponents.slice(1), middleware);
        }
      }
    }
    // If not, create node and recurse
    const newNode = new RouteTreeNode(pathComponents[0], componentPattern, componentKeys);
    this.children.push(newNode);
    return newNode.addRoute(pattern, pathComponents.slice(1), middleware);
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
      return null;
    } else if (path[0].length === 0) {
      // skip any empty path segments
      path.shift();
      return this.match(path, keyValues);
    }
    const currComponent = path.shift();
    for (const child of this.children) {
      const match = currComponent.match(child.componentPattern);
      if (match === null) {
        continue; // try next child
      }
      child.componentKeys.forEach((k, idx) => {
        keyValues[k.name] = match[idx + 1];
      });
      // recurse if necessary
      if (path.length > 0) {
        return child.match(path, keyValues);
      }
      // otherwise, return the result
      return new RouteTreeResult(keyValues, child.middleware);
    }
    // if we made it here, no child matched currComponent
    return null;
  }
}

module.exports.Methods = Methods;

module.exports.RouteTreeNode = RouteTreeNode;

module.exports.RouteTreeRoot = RouteTreeRoot;
