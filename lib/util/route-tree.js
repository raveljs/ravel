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
      throw new Error(`Unsupported method type ${method}`);
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
   *
   * @private
   * @param {RouteTreeNode} leftNode - The left node.
   * @param {RouteTreeNode} rightNode - The right node.
   * @returns {boolean} true, iff leftNode <= rightNode
   */
  static compare (leftNode, rightNode) {
    // TODO
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
    }
    const componentKeys = [];
    const componentPattern = pathToRegexp(pathComponents[0], componentKeys);
    // check if an existing child has the first pathComponent
    for (const child of this.children) {
      if (child.componentPattern === componentPattern) {
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
    // TODO
  }
}

module.exports.Methods = Methods;

module.exports.RouteTreeNode = RouteTreeNode;

module.exports.RouteTreeRoot = RouteTreeRoot;
