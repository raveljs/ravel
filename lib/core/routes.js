'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const ApplicationError = require('../util/application_error');
const httpCodes = require('../util/http_codes');

// Allows us to detect duplicate binds
const endpoints = new Map();

// Symbols for HTTP methods
const GET = Symbol.for('get');
const POST = Symbol.for('post');
const PUT = Symbol.for('put');
const DELETE = Symbol.for('delete');

// process all methods and add to koa app
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

  ravelInstance.Log.info(`Registering endpoint ${verb} ${fullPath}`);

  let args = [fullPath];

  //get middleware by calling appropriate method on routes object
  const middleware = [];

  //apply class-level @before middleware, if any
  let toInject = [].concat(Metadata.getClassMetaValue(routes, '@before', 'middleware', []));

  //then method-level @before middleware, if any
  toInject = toInject.concat(Metadata.getMethodMetaValue(routes, methodName, '@before', 'middleware', []));

  for (let i=0; i<toInject.length; i++) {
    const m = toInject[i];
    middleware.push(ravelInstance[symbols.injector].getModule(routes, m));
  }

  //finally push actual function methodName, but wrap it with a generator
  if (meta.endpoint) {
    middleware.push(function*(next) {
      const result = meta.endpoint(this);
      // yield promises, so that exceptions can be caught properly
      if (result instanceof Promise) {
        yield result;
      }
      yield next;
    });
  } else {
    middleware.push(function*(next) {
      this.status = meta.status ? meta.status : httpCodes.NOT_IMPLEMENTED;
      yield next;
    });
  }

  args = args.concat(middleware);
  // now call underlying koa method to register middleware at specific route
  koaRouter[verb](...args);
};


/**
 * Provides Ravel with a simple mechanism of registering
 * Koa routes, which should generally only be used
 * for serving templated pages or static content (not
 * for building RESTful APIs, for which Ravel.Resource
 * is more applicable). Clients will extend this abstract
 * superclass to create a Routes module.
 */
class Routes {

  static get GET() { return GET; }
  static get POST() { return POST; }
  static get PUT() { return PUT; }
  static get DELETE() { return DELETE; }

  // It's expected that subclasses will call super(basePath)
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
}
Routes.prototype[symbols.routesInitFunc] = function(ravelInstance, koaRouter, shouldLog) {
  this.respond = new (require('../util/rest'))(ravelInstance).respond();
  this.log = ravelInstance.Log.getLogger(this.constructor.name);
  this.ApplicationError = ravelInstance.ApplicationError;
  this.kvstore = ravelInstance.kvstore;
  this.params = {
    get: ravelInstance.get
  };
  const proto = Object.getPrototypeOf(this);

  // handle class-level @mapping decorators
  const classMeta = Metadata.getClassMeta(proto, '@mapping', Object.create(null));
  for (let r of Object.keys(classMeta)) {
    buildRoute(ravelInstance, this, koaRouter, r, classMeta[r], shouldLog);
  }

  // handle methods decorated with @mapping
  const meta = Metadata.getMeta(proto).method;
  const annotatedMethods = Object.keys(meta);
  for (let r of annotatedMethods) {
    const methodMeta = Metadata.getMethodMetaValue(proto, r, '@mapping', 'info');
    if (methodMeta) {
      buildRoute(ravelInstance, this, koaRouter, r, methodMeta, shouldLog);
    }
  }
};

// add in @before decorator as static property
require('./decorators/before')(Routes);

// add in @mapping decorator as static property
require('./decorators/mapping')(Routes);

module.exports = function(Ravel) {

  // Make Routes class available statically for extension
  Ravel.Routes = Routes;

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

// mix class into exports so other classes can subclass it
module.exports.Routes = Routes;
