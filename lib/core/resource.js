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
const pre = require('../util/pre');

// Allows us to detect duplicate binds
const endpoints = {};

// process all methods and add to express app
const buildRoute = function(ravelInstance, resource, app, methodType, methodName) {
  let bp = resource.basePath;
  if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
    bp = upath.join(resource.basePath, '/:id');
  }
  let args = [bp];
  if (typeof resource[methodName] === 'function') {
    resource.log.info(`Registering resource endpoint ${methodType.toUpperCase()} ${bp}`);
    args.push(resource.broadcastMiddleware);

    //get middleware by calling appropriate method on resource object
    const middleware = [];
    let toInject = resource[`_middleware_${methodName}`];

    //apply class-level @pre middleware, if any
    if (resource._resourceWideMiddleware && Array.isArray(resource._resourceWideMiddleware)) {
      toInject = resource._resourceWideMiddleware.concat(toInject);
    }

    for (let i=0; i<toInject.length; i++) {
      const m = toInject[i];
      if (typeof m !== 'string') {
        throw new ApplicationError.IllegalValue('Values supplied to @pre decorator must be strings.');
      } else {
        middleware.push(ravelInstance._injector.getModule(resource, m));
      }
    }

    //finally push actual function methodName
    middleware.push(resource[methodName]);

    args = args.concat(middleware);

    // now call underlying express method to register middleware at specific route
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
  }

  _init(ravelInstance, app) {
    this.respond = new (require('../util/rest'))(ravelInstance).respond;
    this.log = ravelInstance.Log.getLogger(typeof this);
    this.broadcastMiddleware = require('../ws/util/broadcast_middleware')(ravelInstance);
    buildRoute(ravelInstance, this, app, 'get', 'getAll');
    buildRoute(ravelInstance, this, app, 'put', 'putAll');
    buildRoute(ravelInstance, this, app, 'delete', 'deleteAll');
    buildRoute(ravelInstance, this, app, 'get', 'get');
    buildRoute(ravelInstance, this, app, 'post', 'post');
    buildRoute(ravelInstance, this, app, 'put', 'put');
    buildRoute(ravelInstance, this, app, 'delete', 'delete');
  }
}

/**
 * Decorator for adding middleware before an endpoint
 */
Resource.pre = pre;

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

    const resourceClass = require(upath.join(this.cwd, resourcePath));
    if (resourceClass.prototype instanceof Resource) {
      //build resource instantiation function, which takes the
      //current express app as an argument
      this._resourceFactories[resourcePath] = (app) => {
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
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Resource with path ${resourcePath} must be a subclass of Ravel.Resource`);
    }
  };

  /**
   * Performs reseource initialization, executing resource factories
   * in dependency order in Ravel.init()
   *
   * @param app expressApp
   */
  Ravel.prototype._resourceInit = function(app) {
    for (let r of Object.keys(this._resourceFactories)) {
      this._resourceFactories[r](app);
    }
  };
};
