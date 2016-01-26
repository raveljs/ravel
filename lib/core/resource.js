'use strict';

/**
 * Provides Ravel with a mechanism to register a RESTful
 * resource, and gives the client the ability to define
 * up to 7 methods on that resource endpoint (GET, POST,
 * PUT, DELETE, GET all, PUT all, DELETE all).
 *
 * Also supports, via broadcast_middleware.js, the
 * publishing of messages to clients in specific
 * websocket rooms (based on the path of the resource)
 * concerning events which have occurred at this endpoint
 * (such as the creation of a new record or the alteration
 * of an existing one).
 */

const upath = require('upath');
const httpCodes = require('../util/http_codes');
const ApplicationError = require('../util/application_error');

// Allows us to detect duplicate binds
const endpoints = {};

// process all methods and add to express app
const buildRoute = function(resource, app, methodType, methodName) {
  let bp = resource.basePath;
  if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
    bp = upath.join(resource.basePath, '/:id');
  }
  let args = [bp];
  if (resource._methods[methodName]) {
    resource.log.info(`Registering resource endpoint ${methodType.toUpperCase()} ${bp}`);
    args.push(resource.broadcastMiddleware);
    args = args.concat(resource._methods[methodName]);
    app[methodType].apply(app, args);
  } else {
    //resource.log.info('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
    app[methodType](bp, function(req, res) {
      res.status(httpCodes.NOT_IMPLEMENTED).end();
    });
  }
};

/**
 * A superclass extended to create a Ravel Resource
 */
class Resource {
  // It's expected that subclasses will call super(basePath)
  constructor(basePath) {
    if (basePath === undefined) {
      //then $Resource.bind wasn't used within the resource module before building this route
      throw new ApplicationError.IllegalValue(
        `Resource module \'${typeof this}\' must call super(basePath)`);
    }
    // normalize and validate base path
    const bp = upath.normalize(basePath);
    // if a resource with this name has already been regsitered, error out
    if (endpoints[bp]) {
      throw new ApplicationError.DuplicateEntry(
        `Resource with name \'${bp}\' has already been registered.`);
    } else {
      this.basePath = bp;
      endpoints[bp] = true;
    }

    //stores middleware for constious REST methods
    this._methods = {};
  }

  _init(Ravel, app) {
    this.respond = new (require('../util/rest'))(Ravel).respond;
    this.log = Ravel.Log.getLogger(typeof this);
    this.broadcastMiddleware = require('../ws/util/broadcast_middleware')(Ravel);
    buildRoute(this, app, 'get', 'getAll');
    buildRoute(this, app, 'put', 'putAll');
    buildRoute(this, app, 'delete', 'deleteAll');
    buildRoute(this, app, 'get', 'get');
    buildRoute(this, app, 'post', 'post');
    buildRoute(this, app, 'put', 'put');
    buildRoute(this, app, 'delete', 'delete');
  }

  getAll(...middleware) {
    this._methods['getAll'] = middleware;
  }
  get(...middleware) {
    this._methods['get'] = middleware;
  }
  putAll(...middleware) {
    this._methods['putAll'] = middleware;
  }
  put(...middleware) {
    this._methods['put'] = middleware;
  }
  deleteAll(...middleware) {
    this._methods['deleteAll'] = middleware;
  }
  delete(...middleware) {
    this._methods['delete'] = middleware;
  }
  post(...middleware) {
    this._methods['post'] = middleware;
  }
}

module.exports = function(Ravel) {
  // Make Resource class available statically for extension
  Ravel.Resource = Resource;

  /**
   * Register a RESTful resource with Ravel
   *
   * A resource is a set of RESTful endpoints for a single Resource
   *
   * @param {String} resourcePath the path of the resource module to require(...)
   *
  */
  Ravel.prototype.resource = function(resourcePath) {
    if (this._resourceFactories[resourcePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Attempted to register resource module ${resourcePath} twice.`);
    }

    //build resource instantiation function, which takes the
    //current express app as an argument
    this._resourceFactories[resourcePath] = (app) => {
      const resourceClass = require(upath.join(this.cwd, resourcePath));
      const resource = this._injector.inject({
        '$E': this.ApplicationError,
        '$KV': this.kvstore,
        '$Broadcast': this.broadcast,
        '$MiddlewareTransaction': this.db.middleware,
        '$Private': this.authorize,
        '$PrivateRedirect': this.authorizeWithRedirect,
        '$Params': {
          set: this.set,
          get: this.get,
          registerSimpleParameter: this.registerSimpleParameter
        }
      }, resourceClass);
      resource._init(this, app);
      return resource;
    };
  };
};
