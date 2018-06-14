'use strict';

const httpCodes = require('../util/http_codes');
const $err = require('../util/application_error');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const Routes = require('./routes').Routes;
const initRoutes = require('./routes').initRoutes;
const mapping = Routes.mapping;
const coreServices = require('./services');

/**
 * Process all methods and add @mapping decorators as necessary, so we can
 * hand this off to the Routes init() function.
 *
 * @private
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 * @param {Class} resource - A reference to a Resource class.
 * @param {string} methodType - The HTTP method type.
 * @param {string} methodName - The name of the handler method within the class.
 */
const buildRoute = function (ravelInstance, resource, methodType, methodName) {
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
    mapping(
      methodType,
      subpath,
      httpCodes.NOT_IMPLEMENTED,
      true
    )(Object.getPrototypeOf(resource).constructor, undefined);
  }
};

/**
 * Initialization function called by Ravel during init().
 *
 * @private
 *
 * @param {Ravel} ravelInstance - A reference to a Ravel application instance.
 * @param {Object} koaRouter - A reference to a koa-router object.
 */
function initResource (ravelInstance, koaRouter) {
  // decorate methods with @mapping before handing off to Routes init
  buildRoute(ravelInstance, this, Routes.GET, 'getAll');
  buildRoute(ravelInstance, this, Routes.PUT, 'putAll');
  buildRoute(ravelInstance, this, Routes.DELETE, 'deleteAll');
  buildRoute(ravelInstance, this, Routes.GET, 'get');
  buildRoute(ravelInstance, this, Routes.POST, 'post');
  buildRoute(ravelInstance, this, Routes.PUT, 'put');
  buildRoute(ravelInstance, this, Routes.DELETE, 'delete');

  // hand off to routes init
  initRoutes.call(this, ravelInstance, koaRouter);
}

/*!
 * Populate Ravel prototype with resource() method, Resource class, etc.
 * @external Ravel
 */
module.exports = function (Ravel) {
  /**
   * Retrieve an initialized Ravel `Resource` module by its `basePath`, after `app.init()`.
   * Useful for [testing](#testing-ravel-applications).
   *
   * @param {string} basePath - The basePath of the Resource module.
   */
  Ravel.prototype.resource = function (basePath) {
    if (!this.initialized) {
      throw new this.$err.General('Cannot retrieve a Resource reference from Ravel before app.init().');
    }
    return this[symbols.resource][basePath];
  };

  /**
   * Register a RESTful `Resource` with Ravel.
   *
   * This method is not generally meant to be used directly.
   * Instead, use `app.scan` (see [`Ravel.scan`](#Ravel#scan)).
   *
   * @private
   * @param {Function} resourceClass - A Resource class.
   *
  */
  Ravel.prototype[symbols.loadResource] = function (resourceClass) {
    const basePath = Metadata.getClassMetaValue(resourceClass.prototype, '@role', 'name');

    // if routes with this base path has already been registered, error out
    if (this[symbols.endpoints].has(basePath)) {
      throw new $err.DuplicateEntry(
        `Resource or Routes with name '${basePath}' has already been registered.`);
    } else {
      this.basePath = basePath;
      this[symbols.endpoints].set(basePath, true);
    }

    Metadata.putClassMeta(resourceClass.prototype, 'ravel', 'instance', this);
    // store known resource with path as the key, so someone can reflect on the class
    this[symbols.registerClassFunc](basePath, resourceClass);
    // build resource instantiation function, which takes the
    // current koa app as an argument
    this[symbols.resourceFactories][basePath] = (koaRouter) => {
      const resource = this[symbols.injector].inject(coreServices(this, basePath), resourceClass);
      initResource.call(resource, this, koaRouter);
      this[symbols.resource][basePath] = resource;
      return resource;
    };
  };

  /**
   * Performs resource initialization, executing resource factories
   * in dependency order in Ravel.init().
   *
   * @param {Object} router - Instance of koa-router.
   * @private
   */
  Ravel.prototype[symbols.resourceInit] = function (router) {
    for (const r of Object.keys(this[symbols.resourceFactories])) {
      this[symbols.resourceFactories][r](router);
    }
  };
};

/*!
 * Export `Resource` class
 */
module.exports.Resource = require('./decorators/resource');

/**
 * The `@mapping` decorator for `Routes` classes does not work on `Resources`.
 * Will throw an exception.
 *
 * @memberof Resource
 */
module.exports.Resource.mapping = function () {
  throw new $err.NotImplemented('@mapping is not applicable to Resource classes.');
};

/**
 * The `@before` decorator for `Routes` and `Resource` classes.
 *
 * See [`before`](#before) for more information.
 * @memberof Resource
 */
module.exports.Resource.before = require('./decorators/before');

/**
 * The `@transaction` decorator for `Routes` and `Resource` classes.
 *
 * See [`transaction`](#transaction) for more information.
 * @memberof Resource
 */
module.exports.Resource.transaction = require('../db/decorators/transaction');

/**
 * The `@authenticated` decorator for `Routes` and `Resource` classes.
 *
 * See [`authenticated`](#authenticated) for more information.
 * @memberof Resource
 */
module.exports.Resource.authenticated = require('../auth/decorators/authenticated');

/**
 * The `@cache` decorator for `Routes` and `Resource` calsses.
 *
 * See [`cache`](#cache) for more information.
 * @memberof Resource
 */
module.exports.Resource.cache = require('./decorators/cache');
