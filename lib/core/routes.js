'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const ApplicationError = require('../util/application_error');
const rest = new (require('../util/rest'))(this.app);
const AuthenticationMiddleware = require('../auth/authenticate_request');

// Allows us to detect duplicate binds
const endpoints = new Map();

// Symbols for HTTP methods
const GET = Symbol.for('get');
const POST = Symbol.for('post');
const PUT = Symbol.for('put');
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
const buildRoute = function (ravelInstance, routes, koaRouter, methodName, meta) {
  const fullPath = upath.join(routes.basePath, meta.path);

  let verb;
  switch (meta.verb) {
    case PUT:
      verb = 'put';
      break;
    case POST:
      verb = 'post';
      break;
    case DELETE:
      verb = 'delete';
      break;
    default:
      verb = 'get';
  }

  if (!meta.suppressLog) {
    ravelInstance.log.info(`Registering endpoint ${verb} ${fullPath}`);
  }

  let args = [fullPath];

  // build middleware from metadata
  const middleware = [];

  // apply class-level @authenticated middleware, if present
  // we only need to check for method-level @authenticated if it isn't on the class
  if (Metadata.getClassMeta(routes, '@authenticated')) {
    const config = Metadata.getClassMetaValue(routes, '@authenticated', 'config', {});
    middleware.push(
      new AuthenticationMiddleware(ravelInstance, config.shouldRedirect, config.allowRegistration).middleware());
  } else if (Metadata.getMethodMeta(routes, methodName, '@authenticated')) {
    const config = Metadata.getMethodMetaValue(routes, methodName, '@authenticated', 'config', {});
    middleware.push(
      new AuthenticationMiddleware(ravelInstance, config.shouldRedirect, config.allowRegistration).middleware());
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
    middleware.push(ravelInstance.db.middleware(...dbProviders));
  }

  // apply class-level @before middleware, if any
  let toInject = [].concat(Metadata.getClassMetaValue(routes, '@before', 'middleware', []));

  // then method-level @before middleware, if any
  toInject = toInject.concat(Metadata.getMethodMetaValue(routes, methodName, '@before', 'middleware', []));

  for (let i = 0; i < toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  // finally push actual function handler, but wrap it with a generator
  if (meta.endpoint) {
    middleware.push(async function (ctx, next) {
      let result = meta.endpoint.bind(routes)(ctx);
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
};

/**
 * Provides Ravel with a simple mechanism for registering `koa` routes, which should generally only be used
 * for serving templated pages or static content (not for building RESTful APIs, for which `Ravel.Resource`
 * is more applicable). Clients extend this abstract superclass to create a `Routes` module.
 *
 * @example
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const before = Routes.before;
 *
 * // you can inject your own Modules and npm dependencies into Routes
 * // &#64;inject('koa-convert', 'koa-better-body', 'fs', 'custom-module')
 * class MyRoutes extends Routes {
 *   constructor (convert, bodyParser, fs, custom) {
 *     super('/'); // base path for all routes in this class
 *     this.bodyParser = convert(bodyParser()); // make bodyParser middleware available and async/await compatible
 *     this.fs = fs;
 *     this.custom = custom;
 *   }
 *
 *   // will map to /app
 *   // &#64;mapping(Routes.GET, 'app')
 *   // &#64;before('bodyParser') // use bodyParser middleware before handler
 *   async appHandler (ctx) {
 *     // ctx is a koa context object.
 *     // await on Promises, and set ctx.body to create a body for response
 *     // "OK" status code will be chosen automatically unless configured via ctx.status
 *     // Extend and throw a Ravel.Error to send an error status code
 *   }
 * }
 *
 * module.exports = MyRoutes;
 */
class Routes {
  /**
   * Used with the @mapping decorator to indicate the `GET` HTTP verb.
   *
   * @type Symbol
   * @example
   * const Routes = require('ravel').Routes;
   * const mapping = Routes.mapping;
   * class MyRoutes extends Routes {
   *   constructor () {
   *     super('/');
   *   }
   *   // &#64;mapping(Routes.GET, '/something')
   *   async handler (ctx) {
   *     //...
   *   }
   * }
   */
  static get GET () { return GET; }

  /**
   * Used with the @mapping decorator to indicate the `POST` HTTP verb.
   *
   * @type Symbol
   * @example
   * const Routes = require('ravel').Routes;
   * const mapping = Routes.mapping;
   * class MyRoutes extends Routes {
   *   constructor () {
   *     super('/');
   *   }
   *   // &#64;mapping(Routes.POST, '/something')
   *   async handler (ctx) {
   *     //...
   *   }
   * }
   */
  static get POST () { return POST; }

  /**
   * Used with the @mapping decorator to indicate the `PUT` HTTP verb.
   *
   * @type Symbol
   * @example
   * const Routes = require('ravel').Routes;
   * const mapping = Routes.mapping;
   * class MyRoutes extends Routes {
   *   constructor () {
   *     super('/');
   *   }
   *   // &#64;mapping(Routes.PUT, '/something')
   *   async handler (ctx) {
   *     //...
   *   }
   * }
   */
  static get PUT () { return PUT; }

  /**
   * Used with the @mapping decorator to indicate the `DELETE` HTTP verb.
   *
   * @type Symbol
   * @example
   * const Routes = require('ravel').Routes;
   * const mapping = Routes.mapping;
   * class MyRoutes extends Routes {
   *   constructor () {
   *     super('/');
   *   }
   *   // &#64;mapping(Routes.DELETE, '/something')
   *   async handler (ctx) {
   *     //...
   *   }
   * }
   */
  static get DELETE () { return DELETE; }

  /**
   * Subclasses must call `super(basePath)`.
   *
   * @param {string} basePath - The base path for all routes in this class. Should be unique within an application.
   * @example
   * const Routes = require('ravel').Routes;
   * const mapping = Routes.mapping;
   * class MyRoutes extends Routes {
   *   constructor () {
   *     super('/user/:userId');
   *   }
   *
   *   // will map to /user/:id/projects/:id
   *   // &#64;mapping(Routes.GET, '/projects/:id')
   *   async handler (ctx) {
   *     // can access ctx.params.userId and ctx.params.id here
   *     // ...
   *   }
   * }
   */
  constructor (basePath) {
    if (basePath === undefined) {
      throw new ApplicationError.IllegalValue(
        `Routes module '${this.constructor.name}' must call super(basePath)`);
    }
    // normalize and validate base path
    const bp = upath.normalize(basePath);
    // if routes with this base path has already been regsitered, error out
    if (endpoints.has(bp)) {
      throw new ApplicationError.DuplicateEntry(
        `Resource with name '${bp}' has already been registered.`);
    } else {
      this.basePath = bp;
      endpoints.set(bp, true);
    }
  }

  /**
   * A reference to the ravel instance with which this Module is registered.
   *
   * @type Ravel
   */
  get app () {
    return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'ravel', 'instance');
  }

  /**
   * Ravel's pre-packaged error types.
   *
   * @type {Ravel.Error}
   */
  get ApplicationError () {
    return this.app.ApplicationError;
  }

  /**
   * The logger for this `Routes` class. Will log messages prefixed with the `Routes` class name.
   * See [`Logger`](#logger) for more information.
   *
   * @type Logger
   * @example
   * this.log.trace('A trace message');
   * this.log.verbose('A verbose message');
   * this.log.debug('A debug message');
   * this.log.info('A info message');
   * this.log.warn('A warn message');
   * this.log.error('A error message');
   * this.log.critical('A critical message');
   * @example
   * // string interpolation is supported
   * this.log.info('Created record with id=%s', '42');
   * @example
   * // Errors are supported
   * this.log.error('Something bad happened!', new Error('Ahh!'));
   */
  get log () {
    return this.app.log.getLogger(this.name);
  }

  /**
   * A reference to the internal Ravel key-value store connection (redis).
   * See [node-redis](https://github.com/NodeRedis/node_redis) for more information.
   *
   * @type Object
   */
  get kvstore () {
    return this.app.kvstore;
  }

  /**
   * An Object with a get() method, which allows easy access to `app.get()`.
   * See [`Ravel.get`](#Ravel#get) for more information.
   *
   * @type Object
   * @example
   * this.params.get('some ravel parameter');
   */
  get params () {
    const ravelInstance = this.app;
    return {
      get: ravelInstance.get.bind(ravelInstance)
    };
  }
}

/**
 * Initializer for this `Routes` class.
 *
 * @param {Ravel} ravelInstance - Instance of a Ravel app.
 * @param {Object} koaRouter - Instance of koa-router.
 * @private
 */
Routes.prototype[symbols.routesInitFunc] = function (ravelInstance, koaRouter) {
  const proto = Object.getPrototypeOf(this);
  // handle class-level @mapping decorators
  const classMeta = Metadata.getClassMeta(proto, '@mapping', Object.create(null));
  for (let r of Object.keys(classMeta)) {
    buildRoute(ravelInstance, this, koaRouter, r, classMeta[r]);
  }

  // handle methods decorated with @mapping
  const meta = Metadata.getMeta(proto).method;
  const annotatedMethods = Object.keys(meta);
  for (let r of annotatedMethods) {
    const methodMeta = Metadata.getMethodMetaValue(proto, r, '@mapping', 'info');
    if (methodMeta) {
      buildRoute(ravelInstance, this, koaRouter, r, methodMeta);
    }
  }
};

/**
 * The `@mapping` decorator for `Routes` classes.
 *
 * See [`mapping`](#mapping) for more information.
 */
Routes.mapping = require('./decorators/mapping');

/**
 * The `@before` decorator for `Routes` and `Resource` classes.
 *
 * See [`before`](#before) for more information.
 */
Routes.before = require('./decorators/before');

/**
 * The `@transaction` decorator for `Routes` and `Resource` classes.
 *
 * See [`transaction`](#transaction) for more information.
 */
Routes.transaction = require('../db/decorators/transaction');

/**
 * The `@authenticated` decorator for `Routes` and `Resource` classes.
 *
 * See [`authenticated`](#authenticated) for more information.
 */
Routes.authenticated = require('../auth/decorators/authenticated');

/*!
 * Populate `Ravel` class with `routes` method and initialization function
 */
module.exports = function (Ravel) {
  /**
   * Register a bunch of plain GET koa middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given
   * base path.
   *
   * @param {string} routesModulePath - The path of the routes module to require(...).
   */
  Ravel.prototype.routes = function (routesModulePath) {
    // if a module with this name has already been regsitered, error out
    if (this[symbols.routesFactories][routesModulePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Route module '${routesModulePath}' has already been registered.`);
    }
    const absPath = upath.isAbsolute(routesModulePath) ? routesModulePath : upath.join(this.cwd, routesModulePath);
    const routesClass = require(absPath);
    if (routesClass.prototype instanceof Routes) {
      // store reference to this ravel instance in metadata
      Metadata.putClassMeta(routesClass.prototype, 'ravel', 'instance', this);
      // store path to module file in metadata
      Metadata.putClassMeta(routesClass.prototype, 'source', 'path', routesModulePath);
      // store known routes module with path as the key, so someone can reflect on the class
      this[symbols.registerClassFunc](routesModulePath, routesClass);
      // build routes instantiation function, which takes the
      // current koa app as an argument
      this[symbols.routesFactories][routesModulePath] = (koaRouter) => {
        const routes = this[symbols.injector].inject({}, routesClass);
        routes[symbols.routesInitFunc](this, koaRouter);
        return routes;
      };
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Routes Module with path ${absPath} must be a subclass of Ravel.Routes`);
    }
  };

  /**
   * Performs routes initialization, executing routes factories
   * in dependency order in `Ravel.init()`.
   *
   * @param {Object} router - A reference to a koa router object.
   * @private
   */
  Ravel.prototype[symbols.routesInit] = function (router) {
    for (let r of Object.keys(this[symbols.routesFactories])) {
      this[symbols.routesFactories][r](router);
    }
  };
};

/*!
 * Export `Routes` class
 */
module.exports.Routes = Routes;
