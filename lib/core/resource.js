'use strict';

/**
 * Provides Ravel with a mechanism to register a RESTful
 * resource, and gives the client the ability to define
 * up to 7 methods on that resource endpoint (GET, POST,
 * PUT, DELETE, GET all, PUT all, DELETE all).
 */

const upath = require('upath');
const httpCodes = require('../util/http_codes');
const ApplicationError = require('../util/application_error');
const symbols = require('./symbols');
const utilSymbols = require('../util/symbols');

const sInit = Symbol('_init');

// Allows us to detect duplicate binds
const endpoints = new Map();

// process all methods and add to koa app
const buildRoute = function(ravelInstance, resource, koaRouter, methodType, methodName) {
  let bp = resource.basePath;
  if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
    bp = upath.join(resource.basePath, '/:id');
  }
  let args = [bp];
  if (typeof resource[methodName] === 'function') {
    resource.log.info(`Registering resource endpoint ${methodType.toUpperCase()} ${bp}`);
    // args.push(resource.broadcastMiddleware);

    //get middleware by calling appropriate method on resource object
    const middleware = [];
    let toInject = resource[utilSymbols.beforeMethodMiddleware][methodName];

    //apply class-level @before middleware, if any
    if (resource[utilSymbols.beforeGlobalMiddleware] && Array.isArray(resource[utilSymbols.beforeGlobalMiddleware])) {
      toInject = resource[utilSymbols.beforeGlobalMiddleware].concat(toInject);
    }

    for (let i=0; i<toInject.length; i++) {
      const m = toInject[i];
      middleware.push(ravelInstance[symbols.injector].getModule(resource, m));
    }

    //finally push actual function methodName, but wrap it with a generator
    middleware.push(function*(next) {
      const result = resource[methodName](this);
      // yield promises, so that exceptions can be caught properly
      if (result instanceof Promise) {
        yield result;
      }
      yield next;
    });

    args = args.concat(middleware);

    // now call underlying koa method to register middleware at specific route
    koaRouter[methodType](...args);
  } else {
    //resource.log.info('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
    koaRouter[methodType](bp, function(req, res) {
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
    if (endpoints.has(bp)) {
      throw new ApplicationError.DuplicateEntry(
        `Resource with name \'${bp}\' has already been registered.`);
    } else {
      this.basePath = bp;
      endpoints.set(bp, true);
    }
  }
}
Resource.prototype[sInit] = function(ravelInstance, koaRouter) {
  this.respond = new (require('../util/rest'))(ravelInstance).respond();
  this.log = ravelInstance.Log.getLogger(typeof this);
  this.ApplicationError = ravelInstance.ApplicationError;
  this.kvstore = ravelInstance.kvstore;
  this.params = {
    get: ravelInstance.get
  };
  this.transaction = ravelInstance.db.middleware;
  // this.broadcastMiddleware = require('../ws/util/broadcast_middleware')(ravelInstance);
  buildRoute(ravelInstance, this, koaRouter, 'get', 'getAll');
  buildRoute(ravelInstance, this, koaRouter, 'put', 'putAll');
  buildRoute(ravelInstance, this, koaRouter, 'delete', 'deleteAll');
  buildRoute(ravelInstance, this, koaRouter, 'get', 'get');
  buildRoute(ravelInstance, this, koaRouter, 'post', 'post');
  buildRoute(ravelInstance, this, koaRouter, 'put', 'put');
  buildRoute(ravelInstance, this, koaRouter, 'delete', 'delete');
};

// add in @before decorator as static property
require('../util/before')(Resource);

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
    if (this[symbols.resourceFactories][resourcePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Attempted to register resource module ${resourcePath} twice.`);
    }

    const resourceClass = require(upath.join(this.cwd, resourcePath));
    if (resourceClass.prototype instanceof Resource) {
      //build resource instantiation function, which takes the
      //current koa app as an argument
      this[symbols.resourceFactories][resourcePath] = (koaRouter) => {
          const resource = this[symbols.injector].inject({}, resourceClass);
          resource[sInit](this, koaRouter);
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
   * @param router koa router
   */
  Ravel.prototype[symbols.resourceInit] = function(router) {
    for (let r of Object.keys(this[symbols.resourceFactories])) {
      this[symbols.resourceFactories][r](router);
    }
  };
};
