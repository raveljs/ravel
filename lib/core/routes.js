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
 * process all methods and add to koa app
 * @api private
 */
const buildRoute = function(ravelInstance, routes, koaRouter, methodName, meta) {
  const fullPath = upath.join(routes.basePath, meta.path);

  let verb;
  switch(meta.verb) {
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
      new AuthenticationMiddleware(ravelInstance, config.shouldRedirect, config.allowRegistration).middleware);
  } else if (Metadata.getMethodMeta(routes, methodName, '@authenticated')) {
    const config = Metadata.getMethodMetaValue(routes, methodName, '@authenticated', 'config', {});
    middleware.push(
      new AuthenticationMiddleware(ravelInstance, config.shouldRedirect, config.allowRegistration).middleware);
  }

  // apply respond middleware automatically
  middleware.push(rest.respond());

  let dbProviders = [];
  // apply class-level and method-level @transaction middleware, if present (in the correct order)
  if (Metadata.getClassMeta(routes, '@transaction')) {
    dbProviders = dbProviders.concat(Metadata.getClassMetaValue(routes, '@transaction', 'providers', []));
  }
  if (Metadata.getMethodMeta(routes, methodName, '@transaction')) {
    dbProviders = dbProviders.concat(Metadata.getMethodMetaValue(routes, methodName, '@transaction', 'providers', []));
  }
  if (dbProviders.length > 0) {
    middleware.push(ravelInstance.db.middleware(...dbProviders));
  }

  // apply class-level @before middleware, if any
  let toInject = [].concat(Metadata.getClassMetaValue(routes, '@before', 'middleware', []));

  // then method-level @before middleware, if any
  toInject = toInject.concat(Metadata.getMethodMetaValue(routes, methodName, '@before', 'middleware', []));

  for (let i=0; i<toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  // finally push actual function methodName, but wrap it with a generator
  if (meta.endpoint) {
    middleware.push(function*(next) {
      const result = meta.endpoint.bind(routes)(this);
      // yield promises, so that exceptions can be caught properly
      if (result instanceof Promise) {
        yield result;
      }
      yield next;
    });
  } else {
    middleware.push(function*(next) {
      this.status = meta.status;
      yield next;
    });
  }

  args = args.concat(middleware);
  // now call underlying koa method to register middleware at specific route
  koaRouter[verb](...args);
};


/**
 * Provides Ravel with a simple mechanism of registering Koa routes, which should generally only be used
 * for serving templated pages or static content (not for building RESTful APIs, for which `Ravel.Resource`
 * is more applicable). Clients extend this abstract superclass to create a `Routes` module.
 *
 * @example
 *   const inject = require('ravel').inject;
 *   const Routes = require('ravel').Routes;
 *   const mapping = Routes.mapping;
 *   const before = Routes.before;
 *
 *   // you can inject your own Modules and npm dependencies into Routes
 *   &#64;inject('koa-better-body', 'fs', 'custom-module')
 *   class MyRoutes extends Routes {
 *     constructor(bodyParser, fs, custom) {
 *       super('/'); // base path for all routes in this class
 *       this.bodyParser = bodyParser(); // make bodyParser middleware available
 *       this.fs = fs;
 *       this.custom = custom;
 *     }
 *
 *     // will map to /app
 *     &#64;mapping(Routes.GET, 'app');
 *     &#64;before('bodyParser') // use bodyParser middleware before handler
 *     appHandler(ctx) {
 *       // ctx is a koa context object.
 *       // return a Promise, or simply use ctx to create a body/status code for response
 *       // reject with a Ravel.Error to automatically set an error status code
 *     }
 *   }
 *
 *   module.exports = MyRoutes;
 */
class Routes {

  /**
   * ## HTTP Methods
   */

  /**
   * Used with the @mapping decorator to indicate the GET HTTP verb
   * @example
   *   const Routes = require('ravel').Routes;
   *   const mapping = Routes.mapping;
   *   class MyRoutes extends Routes {
   *     constructor() {
   *       super('/');
   *     }
   *     &#64;mapping(Routes.GET, '/something')
   *     handler(ctx) {
   *       //...
   *     }
   *   }
   */
  static get GET() { return GET; }

  /**
   * Used with the @mapping decorator to indicate the POST HTTP verb
   * @example
   *   const Routes = require('ravel').Routes;
   *   const mapping = Routes.mapping;
   *   class MyRoutes extends Routes {
   *     constructor() {
   *       super('/');
   *     }
   *     &#64;mapping(Routes.POST, '/something')
   *     handler(ctx) {
   *       //...
   *     }
   *   }
   */
  static get POST() { return POST; }

  /**
   * Used with the @mapping decorator to indicate the PUT HTTP verb
   * @example
   *   const Routes = require('ravel').Routes;
   *   const mapping = Routes.mapping;
   *   class MyRoutes extends Routes {
   *     constructor() {
   *       super('/');
   *     }
   *     &#64;mapping(Routes.PUT, '/something')
   *     handler(ctx) {
   *       //...
   *     }
   *   }
   */
  static get PUT() { return PUT; }

  /**
   * Used with the @mapping decorator to indicate the DELETE HTTP verb
   * @example
   *   const Routes = require('ravel').Routes;
   *   const mapping = Routes.mapping;
   *   class MyRoutes extends Routes {
   *     constructor() {
   *       super('/');
   *     }
   *     &#64;mapping(Routes.DELETE, '/something')
   *     handler(ctx) {
   *       //...
   *     }
   *   }
   */
  static get DELETE() { return DELETE; }

  /**
   * Subclasses must call `super(basePath)`
   *
   * @param {String} basePath The base path for all routes in this class
   * @example
   *   const Routes = require('ravel').Routes;
   *   const mapping = Routes.mapping;
   *   class MyRoutes extends Routes {
   *     constructor() {
   *       super('/user/:userId');
   *     }
   *
   *     // will map to /user/:id/projects/:id
   *     &#64;mapping(Routes.GET, '/projects/:id')
   *     handler(ctx) {
   *       // can access ctx.params.userId and ctx.params.id here
   *       // ...
   *     }
   *   }
   */
  constructor(basePath) {
    if (basePath === undefined) {
      throw new ApplicationError.IllegalValue(
        `Routes module \'${this.constructor.name}\' must call super(basePath)`);
    }
    // normalize and validate base path
    const bp = upath.normalize(basePath);
    // if routes with this base path has already been regsitered, error out
    if (endpoints.has(bp)) {
      throw new ApplicationError.DuplicateEntry(
        `Resource with name \'${bp}\' has already been registered.`);
    } else {
      this.basePath = bp;
      endpoints.set(bp, true);
    }
  }

  /**
   * A reference to the ravel instance with which this Module is registered
   */
  get app() {
    return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'ravel', 'instance');
  }

  /**
   * Ravel's pre-packaged error types
   */
  get ApplicationError() {
    return this.app.ApplicationError;
  }

  /**
   * The logger for this `Routes` class. Will log messages prefixed with the `Routes` class name.
   */
  get log() {
    return this.app.log.getLogger(this.name);
  }

  /**
   * The active Ravel key-value store connection (redis).
   * See [util/kvstore](../util/kvstore.js.html) for more information.
   */
  get kvstore() {
    return this.app.kvstore;
  }

  /**
   * An Object with a get() method, which allows easy access to ravel.get()
   * See [core/params](params.js.html) for more information.
   * @example
   *   this.params.get('some ravel parameter');
   */
  get params() {
    const ravelInstance = this.app;
    return {
      get: ravelInstance.get.bind(ravelInstance)
    };
  }
}

/**
 * Initializer for this `Routes` class
 * @api private
 */
Routes.prototype[symbols.routesInitFunc] = function(ravelInstance, koaRouter) {
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
 * See [decorators/mapping](decorators/mapping.js.html) for more information.
 */
Routes.mapping = require('./decorators/mapping');

/**
 * The `@before` decorator for `Routes` and `Resource` classes.
 *
 * See [decorators/before](decorators/before.js.html) for more information.
 */
Routes.before = require('./decorators/before');

/**
 * The `@transaction` decorator for `Routes` and `Resource` classes.
 *
 * See [db/decorators/transaction](../db/decorators/transaction.js.html) for more information.
 */
Routes.transaction = require('../db/decorators/transaction');

/**
 * The `@authenticated` decorator for `Routes` and `Resource` classes.
 *
 * See [auth/decorators/authenticated](../auth/decorators/authenticated.js.html) for more information.
 */
Routes.authenticated = require('../auth/decorators/authenticated');

/*!
 * Populate `Ravel` class with `routes` method and initialization function
 */
module.exports = function(Ravel) {

  /**
   * Register a bunch of plain GET koa middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given
   * base path.
   *
   * @param {String} routesModulePath the path of the routes module to require(...)
   */
  Ravel.prototype.routes = function(routesModulePath) {
    //if a module with this name has already been regsitered, error out
    if (this[symbols.routesFactories][routesModulePath]) {
      throw new this.ApplicationError.DuplicateEntry(
        `Route module \'${routesModulePath}\' has already been registered.`);
    }

    const routesClass = require(upath.join(this.cwd, routesModulePath));
    if (routesClass.prototype instanceof Routes) {
      // store reference to this ravel instance in metadata
      Metadata.putClassMeta(routesClass.prototype, 'ravel', 'instance', this);
      //store path to module file in metadata
      Metadata.putClassMeta(routesClass.prototype, 'source', 'path', routesModulePath);
      // store known routes module with path as the key, so someone can reflect on the class
      this[symbols.registerClassFunc](routesModulePath, routesClass);
      //build routes instantiation function, which takes the
      //current koa app as an argument
      this[symbols.routesFactories][routesModulePath] = (koaRouter) => {
        const routes = this[symbols.injector].inject({}, routesClass);
        routes[symbols.routesInitFunc](this, koaRouter);
        return routes;
      };
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Routes Module with path ${routesModulePath} must be a subclass of Ravel.Routes`);
    }
  };

  /**
   * Performs routes initialization, executing routes factories
   * in dependency order in Ravel.init()
   *
   * @param router koa router
   */
  Ravel.prototype[symbols.routesInit] = function(router) {
    for (let r of Object.keys(this[symbols.routesFactories])) {
      this[symbols.routesFactories][r](router);
    }
  };
};

/**
 * Export `Routes` class
 */
module.exports.Routes = Routes;
