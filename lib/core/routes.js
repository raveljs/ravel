'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const $err = require('../util/application_error');
const rest = new (require('../util/rest'))(this.app);
const AuthenticationMiddleware = require('../auth/authenticate_request');
const ResponseCacheMiddleware = require('../util/response_cache');
const coreServices = require('./services');

// Symbols for HTTP methods
const GET = Symbol.for('get');
const POST = Symbol.for('post');
const PUT = Symbol.for('put');
const PATCH = Symbol.for('patch');
const DELETE = Symbol.for('delete');

/**
 * Process all methods and add to koa app.
 *
 * @private
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 * @param {Routes} routes - A reference to a Routes class.
 * @param {Object} koaRouter - A reference to a koa-router object.
 * @param {string} methodName - The name of the handler method within the class.
 * @param {Object} meta - Metadata from the corresponding `@mapping` decorator.
 */
function buildRoute (ravelInstance, routes, koaRouter, methodName, meta) {
  const basePath = Metadata.getClassMetaValue(routes, '@role', 'name');
  const fullPath = upath.join(basePath, meta.path);

  let verb;
  switch (meta.verb) {
    case PUT:
      verb = 'put';
      break;
    case POST:
      verb = 'post';
      break;
    case PATCH:
      verb = 'patch';
      break;
    case DELETE:
      verb = 'delete';
      break;
    default:
      verb = 'get';
  }

  if (!meta.suppressLog) {
    ravelInstance.$log.info(`Registering endpoint ${verb} ${fullPath}`);
  }

  let args = [fullPath];

  // build middleware from metadata
  const middleware = [];

  // apply class-level @authenticated middleware, if present
  // we only need to check for method-level @authenticated if it isn't on the class
  if (Metadata.getClassMeta(routes, '@authenticated')) {
    const config = Metadata.getClassMetaValue(routes, '@authenticated', 'config', {});
    middleware.push(
      new AuthenticationMiddleware(ravelInstance, config.redirect, config.allowRegistration).middleware());
  } else if (Metadata.getMethodMeta(routes, methodName, '@authenticated')) {
    const config = Metadata.getMethodMetaValue(routes, methodName, '@authenticated', 'config', {});
    middleware.push(
      new AuthenticationMiddleware(ravelInstance, config.redirect, config.allowRegistration).middleware());
  }

  // apply respond middleware automatically
  middleware.push(rest.respond());

  // apply class-level and method-level @transaction middleware, if present (in the correct order)
  let dbProviders;
  if (Metadata.getClassMeta(routes, '@transaction')) {
    dbProviders = Metadata.getClassMetaValue(routes, '@transaction', 'providers', []);
  }
  if (Metadata.getMethodMeta(routes, methodName, '@transaction')) {
    dbProviders = dbProviders || [];
    dbProviders = dbProviders.concat(Metadata.getMethodMetaValue(routes, methodName, '@transaction', 'providers', []));
  }
  if (dbProviders !== undefined) {
    middleware.push(ravelInstance.$db.middleware(...dbProviders));
  }

  // apply class-level @before middleware, if any
  let toInject = [].concat(Metadata.getClassMetaValue(routes, '@before', 'middleware', []));

  // then method-level @before middleware, if any
  toInject = toInject.concat(Metadata.getMethodMetaValue(routes, methodName, '@before', 'middleware', []));

  for (let i = 0; i < toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  // then cache middleware, if present
  // method-level @cache overrides class-level cache
  if (Metadata.getMethodMeta(routes, methodName, '@cache')) {
    const config = Metadata.getMethodMetaValue(routes, methodName, '@cache', 'options', {});
    middleware.push(
      new ResponseCacheMiddleware(ravelInstance).middleware(config));
  } else if (Metadata.getClassMeta(routes, '@cache')) {
    const config = Metadata.getClassMetaValue(routes, '@cache', 'options', {});
    middleware.push(
      new ResponseCacheMiddleware(ravelInstance).middleware(config));
  }

  // finally push actual function handler, but wrap it with a generator
  if (meta.endpoint) {
    middleware.push(async function (ctx, next) {
      const result = meta.endpoint.bind(routes)(ctx);
      // if handler returns a Promise, await on it
      if (result && result instanceof Promise) {
        await result;
      }
      // then await next middleware
      await next();
    });
  } else {
    // if there's no handler, this @mapping represents an endpoint which just returns a status code
    middleware.push(async (ctx) => {
      ctx.respondOptions = {okCode: meta.status};
    });
  }

  args = args.concat(middleware);
  // now call underlying koa method to register middleware at specific route
  koaRouter[verb](...args);
}

/**
 * Initializer for this `Routes` class.
 *
 * @param {Ravel} ravelInstance - Instance of a Ravel app.
 * @param {Object} koaRouter - Instance of koa-router.
 * @private
 */
function initRoutes (ravelInstance, koaRouter) {
  const proto = Object.getPrototypeOf(this);
  // handle class-level @mapping decorators
  const classMeta = Metadata.getClassMeta(proto, '@mapping', Object.create(null));
  for (const r of Object.keys(classMeta)) {
    buildRoute(ravelInstance, this, koaRouter, r, classMeta[r]);
  }

  // handle methods decorated with @mapping
  const meta = Metadata.getMeta(proto).method;
  const annotatedMethods = Object.keys(meta);
  for (const r of annotatedMethods) {
    const methodMeta = Metadata.getMethodMetaValue(proto, r, '@mapping', 'info');
    if (methodMeta) {
      buildRoute(ravelInstance, this, koaRouter, r, methodMeta);
    }
  }
}

/*!
 * Populate `Ravel` class with `routes` method and initialization function
 */
module.exports = function (Ravel) {
  /**
   * Retrieve an initialized Ravel `Routes` module by its `basePath`, after `app.init()`.
   * Useful for [testing](#testing-ravel-applications).
   *
   * @param {string} basePath - The basePath of the Routes module.
   */
  Ravel.prototype.routes = function (basePath) {
    if (!this.initialized) {
      throw new this.$err.General('Cannot retrieve a Routes reference from Ravel before app.init().');
    }
    return this[symbols.routes][basePath];
  };

  /**
   * Register a bunch of plain koa endpoints with Ravel which
   * will be available, by name, at the given base path.
   *
   * @private
   * @param {Function} routesClass - A Routes class.
   */
  Ravel.prototype[symbols.loadRoutes] = function (routesClass) {
    const basePath = Metadata.getClassMetaValue(routesClass.prototype, '@role', 'name');
    // if routes with this base path has already been registered, error out
    if (this[symbols.endpoints].has(basePath)) {
      throw new $err.DuplicateEntry(
        `Resource or Routes with name '${basePath}' has already been registered.`);
    } else {
      this.basePath = basePath;
      this[symbols.endpoints].set(basePath, true);
    }
    // store reference to this ravel instance in metadata
    Metadata.putClassMeta(routesClass.prototype, 'ravel', 'instance', this);
    // store known routes module with path as the key, so someone can reflect on the class
    this[symbols.registerClassFunc](basePath, routesClass);
    // build routes instantiation function, which takes the
    // current koa app as an argument
    this[symbols.routesFactories][basePath] = (koaRouter) => {
      const routes = this[symbols.injector].inject(coreServices(this, basePath), routesClass);
      initRoutes.call(routes, this, koaRouter);
      this[symbols.routes][basePath] = routes;
      return routes;
    };
  };

  /**
   * Performs routes initialization, executing routes factories
   * in dependency order in `Ravel.init()`.
   *
   * @param {Object} router - A reference to a koa router object.
   * @private
   */
  Ravel.prototype[symbols.routesInit] = function (router) {
    for (const r of Object.keys(this[symbols.routesFactories])) {
      this[symbols.routesFactories][r](router);
    }
  };
};

/*!
 * Export `Routes` decorator, and other useful things
 */
module.exports.Routes = require('./decorators/routes');

/*!
 * Export `Routes` init function for use in Resources
 */
module.exports.initRoutes = initRoutes;

/**
 * Used with the @mapping decorator to indicate the `GET` HTTP verb.
 *
 * @type Symbol
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.GET, '/something')
 *   async handler (ctx) {
 *     //...
 *   }
 * }
 * @memberof Routes
 */
module.exports.Routes.GET = GET;

/**
 * Used with the @mapping decorator to indicate the `POST` HTTP verb.
 *
 * @type Symbol
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.POST, '/something')
 *   async handler (ctx) {
 *     //...
 *   }
 * }
 * @memberof Routes
 */
module.exports.Routes.POST = POST;

/**
 * Used with the @mapping decorator to indicate the `PUT` HTTP verb.
 *
 * @type Symbol
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.PUT, '/something')
 *   async handler (ctx) {
 *     //...
 *   }
 * }
 * @memberof Routes
 */
module.exports.Routes.PUT = PUT;

/**
 * Used with the @mapping decorator to indicate the `PATCH` HTTP verb.
 *
 * @type Symbol
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.PATCH, '/something')
 *   async handler (ctx) {
 *     //...
 *   }
 * }
 * @memberof Routes
 */
module.exports.Routes.PATCH = PATCH;

/**
 * Used with the @mapping decorator to indicate the `DELETE` HTTP verb.
 *
 * @type Symbol
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.DELETE, '/something')
 *   async handler (ctx) {
 *     //...
 *   }
 * }
 * @memberof Routes
 */
module.exports.Routes.DELETE = DELETE;

/**
 * The `@mapping` decorator for `Routes` classes.
 *
 * See [`mapping`](#mapping) for more information.
 * @memberof Routes
 */
module.exports.Routes.mapping = require('./decorators/mapping');

/**
 * The `@before` decorator for `Routes` and `Resource` classes.
 *
 * See [`before`](#before) for more information.
 * @memberof Routes
 */
module.exports.Routes.before = require('./decorators/before');

/**
 * The `@transaction` decorator for `Routes` and `Resource` classes.
 *
 * See [`transaction`](#transaction) for more information.
 * @memberof Routes
 */
module.exports.Routes.transaction = require('../db/decorators/transaction');

/**
 * The `@authenticated` decorator for `Routes` and `Resource` classes.
 *
 * See [`authenticated`](#authenticated) for more information.
 * @memberof Routes
 */
module.exports.Routes.authenticated = require('../auth/decorators/authenticated');

/**
 * The `@cache` decorator for `Routes` and `Resource` calsses.
 *
 * See [`cache`](#cache) for more information.
 * @memberof Routes
 */
module.exports.Routes.cache = require('./decorators/cache');
