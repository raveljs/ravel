'use strict';

const upath = require('upath');
const httpCodes = require('../util/http_codes');
const ApplicationError = require('../util/application_error');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const Routes = require('./routes').Routes;
const mapping = Routes.mapping;

const sInit = Symbol.for('_init');

/**
 * process all methods and add @mapping decorators as necessary, so we can
 * hand this off to the Routes init() function.
 * @api private
 */
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
    // add a fake handler which returns NOT_IMPLEMENTED
    mapping(methodType, subpath, httpCodes.NOT_IMPLEMENTED, true)
      (Object.getPrototypeOf(resource).constructor, undefined);
  }
};


/**
 * What might be referred to as a *controller* in other frameworks, a `Resource` module defines
 * HTTP methods on an endpoint, supporting the session-per-request transaction pattern via Ravel
 * middleware. `Resource`s also support dependency injection, allowing for the easy creation of
 * RESTful interfaces to your `Module`-based application logic. Resources are really just a thin
 * wrapper around `Routes`, using specially-named handler functions (`get`, `getAll`, `post`,
 * `put`, `putAll`, `delete`, `deleteAll`) instead of `@mapping`. This convention-over-configuration
 * approach makes it easier to write proper REST APIs with less code, and is recommended over
 * "carefully chosen" `@mapping`s in a `Routes` class.
 *
 * Omitting any or all of the specially-named handler functions is fine, and will result in a
 * `501 NOT IMPLEMENTED` status when that particular method/endpoint is requested.
 *
 * `Resource`s inherit all the properties, methods and decorators of `Routes`. See [core/routes](routes.js.html)
 * for more information. Note that &#64;mapping does not apply to `Resources`.
 *
 * @example
 *   const inject = require('ravel').inject;
 *   const Resource = require('ravel').Resource;
 *   const before = Routes.before;
 *
 *   // you can inject your own Modules and npm dependencies into Resources
 *   &#64;inject('koa-better-body', 'fs', 'custom-module')
 *   class PersonResource extends Resource {
 *     constructor(bodyParser, fs, custom) {
 *       super('/person'); // base path for all routes in this class
 *       this.bodyParser = bodyParser(); // make bodyParser middleware available
 *       this.fs = fs;
 *       this.custom = custom;
 *     }
 *
 *     // will map to GET /person
 *     &#64;before('bodyParser') // use bodyParser middleware before handler
 *     *getAll(ctx) {
 *       // ctx is a koa context object.
 *       // yield to Promises, and use ctx to create a body/status code for response
 *       // throw a Ravel.Error to automatically set an error status code
 *     }
 *
 *     // will map to GET /person/:id
 *     *get(ctx) {
 *       // can use ctx.params.id in here automatically
 *     }
 *
 *     // will map to POST /person
 *     *post(ctx) {}
 *
 *     // will map to PUT /person
 *     *putAll(ctx) {}
 *
 *     // will map to PUT /person/:id
 *     *put(ctx) {}
 *
 *     // will map to DELETE /person
 *     *deleteAll(ctx) {}
 *
 *     // will map to DELETE /person/:id
 *     *delete(ctx) {}
 *   }
 *
 *   module.exports = PersonResource;
 */
class Resource extends Routes {
  /**
   * Subclasses must call `super(basePath)`
   *
   * @param {String} basePath The base path for all routes in this class. Should be unique within an application.
   * @example
   *   const Resource = require('ravel').Resource;
   *   class PersonResource extends Resource {
   *     constructor() {
   *       super('/user');
   *     }
   *
   *     // will map to /user/:id
   *     *get(ctx) {
   *       // can access ctx.params.userId and ctx.params.id here
   *       // ...
   *     }
   *   }
   */
  constructor(basePath) {
    super(basePath);
  }

  /**
   * @mapping is not be available for `Resource` classes
   */
  static get mapping() {
    throw new ApplicationError.NotImplemented('@mapping is not applicable to Resource classes.');
  }
}

/**
 * Initialization function called by Ravel during init()
 * @api private
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

/*!
 * Populate Ravel prototype with resource() method, Resource class, etc.
 * @external Ravel
 */
module.exports = function(Ravel) {

  /**
   * Register a RESTful `Resource` with Ravel
   *
   * This method is not generally meant to be used directly.
   * Instead, use `app.resources` (see [core/resources](resources.js.html)).
   *
   * @memberof Ravel
   * @param {String} resourcePath the path of the resource module to require(...)
   * @example
   *   app.resource('./resources/myresource');
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
   * @api private
   */
  Ravel.prototype[symbols.resourceInit] = function(router) {
    for (let r of Object.keys(this[symbols.resourceFactories])) {
      this[symbols.resourceFactories][r](router);
    }
  };
};

/*!
 * Export `Resource` class
 */
module.exports.Resource = Resource;
