'use strict';

const upath = require('upath');
const httpCodes = require('../util/http_codes');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const Routes = require('./routes').Routes;
const mapping = Routes.mapping;

const sInit = Symbol.for('_init');

// process all methods and add @mapping decorators as necessary, so we can
// hand this off to the Routes init() function.
const buildRoute = function(ravelInstance, resource, methodType, methodName) {
  let subpath = '';
  if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
    subpath = '/:id';
  }

  if (typeof resource[methodName] === 'function') {
    // use the mapping decorator to map the handler to correct path
    mapping(methodType, subpath)(
      Object.getPrototypeOf(resource),
      methodName,
      {
        value: resource[methodName].bind(resource)
      }
    );
  } else {
    //resource.log.info('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
    // add a fake handler which returns NOT_IMPLEMENTED
    mapping(methodType, subpath, httpCodes.NOT_IMPLEMENTED)(Object.getPrototypeOf(resource).constructor, undefined);
  }
};


/**
 * Provides Ravel with a mechanism to register a RESTful
 * resource, and gives the client the ability to define
 * up to 7 methods on that resource endpoint (GET, POST,
 * PUT, DELETE, GET all, PUT all, DELETE all). Clients
 * will extend Resource and implement handlers with specific
 * names in order to handle different methods on the endpoint.
 */
class Resource extends Routes {
  // It's expected that subclasses will call super(basePath)
  constructor(basePath) {
    super(basePath);
  }
}

/**
 * Initialization function called by Ravel during init()
 */
Resource.prototype[sInit] = function(ravelInstance, koaRouter) {
  // decorate methods with @mapping before handing off to Routes init
  buildRoute(ravelInstance, this, Routes.GET, 'getAll');
  buildRoute(ravelInstance, this, Routes.PUT, 'putAll');
  buildRoute(ravelInstance, this, Routes.DELETE, 'deleteAll');
  buildRoute(ravelInstance, this, Routes.GET, 'get');
  buildRoute(ravelInstance, this, Routes.POST, 'post');
  buildRoute(ravelInstance, this, Routes.PUT, 'put');
  buildRoute(ravelInstance, this, Routes.DELETE, 'delete');

  // hand off to routes init
  this[symbols.routesInitFunc](ravelInstance, koaRouter, false);
};

/**
 * Populate Ravel prototype with resource() method, Resource class, etc.
 */
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
      Metadata.putClassMeta(resourceClass.prototype, 'ravel', 'instance', this);
      // store path to resource file in metadata
      Metadata.putClassMeta(resourceClass.prototype, 'source', 'path', resourcePath);
      // store known resource with path as the key, so someone can reflect on the class
      this[symbols.registerClassFunc](resourcePath, resourceClass);
      // build resource instantiation function, which takes the
      // current koa app as an argument
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
   * @param {Object} router instance of koa-router
   */
  Ravel.prototype[symbols.resourceInit] = function(router) {
    for (let r of Object.keys(this[symbols.resourceFactories])) {
      this[symbols.resourceFactories][r](router);
    }
  };
};

// mix class into exports so other classes can subclass it
module.exports.Resource = Resource;
