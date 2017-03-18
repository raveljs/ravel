'use strict';

const EventEmitter = require('events').EventEmitter;
const coreSymbols = require('./core/symbols');
const Rest = require('./util/rest');

const sInitialized = Symbol();
const sListening = Symbol();
const sLog = Symbol('log');
const sApplicationError = Symbol('ApplicationError');
const sCWD = Symbol('cwd');
const sServer = Symbol('server');
const sUncaughtRejections = Symbol('uncaughtRejections');

/**
 * This class provides Ravel, a lightweight but powerful framework
 * for the rapid creation of enterprise Node.js applications which
 * scale horizontally with ease and support the latest in web technology.
 *
 * @example
 * const Ravel = require('ravel')
 * const app = new Ravel()
 */
class Ravel extends EventEmitter {
  /**
   * Creates a new Ravel app instance
   * @example
   * const Ravel = require('ravel')
   * const app = new Ravel()
   */
  constructor () {
    super();

    this[sUncaughtRejections] = 0;
    this[sInitialized] = false;
    this[sListening] = false;

    // how we store modules for dependency injection
    this[coreSymbols.modules] = Object.create(null);

    // current working directory of the app using the
    // ravel library, so that client modules can be
    // loaded with relative paths.
    this[sCWD] = process.cwd();

    this[coreSymbols.knownParameters] = Object.create(null);
    this[coreSymbols.params] = Object.create(null);
    // a list of registered module factories which haven't yet been instantiated
    this[coreSymbols.moduleFactories] = Object.create(null);
    this[coreSymbols.resourceFactories] = Object.create(null);
    this[coreSymbols.routesFactories] = Object.create(null);
    // a list of known modules, resources and routes so that metadata can be retrieved from them
    this[coreSymbols.knownClasses] = Object.create(null);

    // init errors
    this[sApplicationError] = require('./util/application_error');

    // init logging system
    this[sLog] = new (require('./util/log'))(this);

    // init dependency injection utility, which is used by most everything else
    this[coreSymbols.injector] = new (require('./core/injector'))(this, module.parent);

    // Register known ravel parameters
    // redis parameters
    this.registerParameter('redis host', true, '0.0.0.0');
    this.registerParameter('redis port', true, 6379);
    this.registerParameter('redis password');
    this.registerParameter('redis max retries', true, 10);
    // Node/koa parameters
    this.registerParameter('port', true, 8080);
    this.registerParameter('koa public directory');
    this.registerParameter('koa view directory');
    this.registerParameter('koa view engine');
    this.registerParameter('koa favicon path');
    this.registerParameter('keygrip keys', true);
    // Passport parameters
    this.registerParameter('app route', false, '/');
    this.registerParameter('login route', false, '/login');
  }

  /**
   * The current working directory of the app using the ravel library, so that client modules can be
   * loaded with relative paths.
   * @type {String}
   */
  get cwd () {
    return this[sCWD];
  }

  /**
   * Return the app instance of Logger.
   * See [`Logger`](#logger) for more information.
   * @type {Logger}
   * @example
   *   app.log.error('Something terrible happened!')
   */
  get log () {
    return this[sLog];
  }

  /**
   * A hash of all built-in error types.
   * @type {Object}
   */
  get ApplicationError () {
    return this[sApplicationError];
  }

  /**
   * `true` iff init() or start() has been called on this app instance
   * @type {Boolean}
   */
  get initialized () {
    return this[sInitialized];
  }

  /**
   * `true` iff listen() or start() has been called on this app instance
   * @type {Boolean}
   */
  get listening () {
    return this[sListening];
  }

  /**
   * The underlying HTTP server for this Ravel instance.
   * Only available after listen() (i.e. use @postlisten).
   * @type {http.Server}
   */
  get server () {
    return this[sServer];
  }

  /**
   * Initializes the application, when the client is finished
   * supplying parameters and registering modules, resources
   * routes and rooms.
   */
  init () {
    // application configuration is completed in constructor
    this.emit('pre init');

    // log uncaught errors to prevent ES6 promise error swallowing
    // https://www.hacksrus.net/blog/2015/08/a-solution-to-swallowed-exceptions-in-es6s-promises/
    process.on('unhandledRejection', (err) => {
      this[sUncaughtRejections] += 1;
      const message = `Detected uncaught error in promise: \n ${err ? err.stack : err}`;
      if (this[sUncaughtRejections] >= 10) {
        this.log.error(message);
        this.log.error(`Encountered ${this[sUncaughtRejections]} or more uncaught rejections. Re-run ` +
          'with full logging output for more information: app.set(\'log level\', app.log.TRACE);');
      } else {
        this.log.debug(message);
      }
    });

    // load parameters from .ravelrc.json file, if any
    this.emit('pre load parameters');
    this[coreSymbols.loadParameters]();
    this.emit('post load parameters');

    this[sInitialized] = true;

    this.db = require('./db/database')(this);
    this.kvstore = require('./util/kvstore')(this);

    // App dependencies.
    const http = require('http'); // https will be provided by reverse proxy
    const upath = require('upath');
    const Koa = require('koa');
    const session = require('koa-generic-session');
    const compression = require('koa-compress');
    const favicon = require('koa-favicon');
    const router = new (require('koa-router'))();
    const koaConvert = require('koa-convert');

    // configure koa
    const app = new Koa();
    app.proxy = true;

    // the first piece of middleware is the exception handler
    // catch all errors and return appropriate error codes
    // to the client
    app.use((new Rest(this)).errorHandler());

    // enable gzip compression
    app.use(compression());

    // configure redis session store
    app.keys = this.get('keygrip keys');
    const sessionStoreArgs = {
      host: this.get('redis host'),
      port: this.get('redis port'),
      options: {
        'no_ready_check': true,
        'retry_strategy': require('./util/kvstore').retryStrategy(this)
      }
    };
    if (this.get('redis password')) {
      sessionStoreArgs.pass = this.get('redis password');
    }
    app.use(koaConvert(session({
      store: new (require('./util/redis_session_store'))(this),
      cookie: {
        path: '/',
        httpOnly: true,
        maxage: null,
        rewrite: true,
        signed: true
      }
    })));

    // configure view engine
    if (this.get('koa view engine') && this.get('koa view directory')) {
      const views = require('koa-views');
      app.use(views(upath.join(this.cwd, this.get('koa view directory')), {
        map: {
          html: this.get('koa view engine')
        }
      }));
    }

    // favicon
    if (this.get('koa favicon path')) {
      app.use(favicon(upath.join(this.cwd, this.get('koa favicon path'))));
    }

    // static file serving
    if (this.get('koa public directory')) {
      const koaStatic = require('koa-static');
      const root = upath.join(this.cwd, this.get('koa public directory'));
      app.use(koaConvert(koaStatic(root, {
        gzip: false // this should be handled by koa-compressor?
      })));
    }

    // initialize authentication/authentication
    require('./auth/passport_init.js')(this, router);

    // basic koa configuration is completed
    this.emit('post config koa', app);

    // create registered modules using factories
    this[coreSymbols.moduleInit]();

    this.emit('post module init');

    this.emit('pre routes init', app);

    // create registered resources using factories
    this[coreSymbols.resourceInit](router);

    // create routes using factories
    this[coreSymbols.routesInit](router);

    // include routes as middleware
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Create koa server
    this[sServer] = http.createServer(app.callback());

    // application configuration is completed
    this.emit('post init');
  }

  /**
   * Starts the application. Must be called after initialize()
   */
  listen () {
    return new Promise((resolve, reject) => {
      if (!this[sInitialized]) {
        reject(new this.ApplicationError.NotAllowed('Cannot call Ravel.listen() before Ravel.init()'));
      } else {
        this.emit('pre listen');
        // Start Koa server
        this[sServer].listen(this.get('port'), () => {
          this.log.info('Application server listening on port ' + this.get('port'));
          this.emit('post listen');
          this[sListening] = true;
          resolve();
        });
      }
    });
  }

  /**
   * Intializes and starts the application.
   */
  start () {
    this.init();
    return this.listen();
  }

  /**
   * Stops the application. A no op if the server isn't running.
   */
  close () {
    return new Promise((resolve) => {
      // console.log('closing')
      this.emit('end');
      if (!this[sServer] || !this[sListening]) {
        resolve();
      } else {
        this[sServer].close(() => {
          this.log.info('Application server terminated.');
          this[sListening] = false;
          resolve();
        });
      }
    });
  }
}

/**
 * The base class of Ravel `Error`s, which associate
 * http status codes with your custom errors.
 * @example
 * const Ravel = require('ravel')
 * class NotFoundError extends Ravel.Error {
 *   constructor (msg) {
 *     super(msg, Ravel.httpCodes.NOT_FOUND)
 *   }
 * }
 */
Ravel.Error = require('./util/application_error').General;

/**
 * The base class for Ravel `DatabaseProvider`s. See
 * [`DatabaseProvider`](#databaseprovider) for more information.
 * @example
 * const DatabaseProvider = require('ravel').DatabaseProvider
 * class MySQLProvider extends DatabaseProvider {
 *   // ...
 * }
 */
Ravel.DatabaseProvider = require('./db/database_provider').DatabaseProvider;

/**
 * Return a list of all registered `DatabaseProvider`s. See
 * [`DatabaseProvider`](#databaseprovider) for more information.
 * @return {Array} a list of `DatabaseProvider`s
 * @private
 */
require('./db/database_provider')(Ravel);

/**
 * The base class for Ravel `AuthenticationProvider`s. See
 * [`AuthenticationProvider`](#authenticationprovider) for more information.
 * @example
 * const AuthenticationProvider = require('ravel').AuthenticationProvider
 * class GoogleOAuth2Provider extends AuthenticationProvider {
 *   // ...
 * }
 */
Ravel.AuthenticationProvider = require('./auth/authentication_provider').AuthenticationProvider;

/**
 * Return a list of all registered `AuthenticationProvider`s. See
 * [`AuthenticationProvider`](#authenticationprovider) for more information.
 * @return {Array} a list of `AuthenticationProvider`s
 * @private
 */
require('./auth/authentication_provider')(Ravel);

/*
 * Makes the `@inject` decorator available as `Ravel.inject`
 * @example
 *   const Ravel = require('ravel')
 *   const inject = Ravel.inject
 */
Ravel.inject = require('./core/decorators/inject');

/**
 * A dictionary of useful http status codes
 * @example
 * const Ravel = require('ravel')
 * console.log(Ravel.httpCodes.NOT_FOUND)
 */
Ravel.httpCodes = require('./util/http_codes');

/**
 * Requires Ravel's parameter system
 * See `core/params` for more information.
 * @example
 * app.registerParameter('my parameter', true, 'default value')
 * const value = app.get('my parameter')
 * app.set('my parameter', 'another value')
 * @private
 */
require('./core/params')(Ravel);

/**
 * The base class for Ravel `Module`s. See
 * [`Module`](#module) for more information.
 * @example
 * const Module = require('ravel').Module
 * class MyModule extends Module {
 *   // ...
 * }
 * module.exports = MyModule
 */
Ravel.Module = require('./core/module').Module;

/**
 * Requires Ravel's `Module` registration system
 * See [`Module`](#module) for more information.
 * @example
 * app.module('./modules/mymodule', 'mymodule')
 * @private
 */
require('./core/module')(Ravel);

/**
 * Requires Ravel's recursive `Module` registration system.
 * Names for modules are derived from their file names, and
 * are namespaced by their directories.
 * See [`Module`](#module) for more information.
 * @example
 * // recursively load all Modules in a directory
 * app.modules('./modules')
 * // a Module 'modules/test.js' in ./modules can be injected as `@inject('test')`
 * // a Module 'modules/stuff/test.js' in ./modules can be injected as `@inject('stuff.test')`
 * @private
 */
require('./core/modules')(Ravel);

/**
 * The base class for Ravel `Routes`. See
 * [`Routes`](#routes) for more information.
 * @example
 * const Routes = require('ravel').Routes
 * class MyRoutes extends Routes {
 *   // ...
 * }
 * module.exports = MyRoutes
 */
Ravel.Routes = require('./core/routes').Routes;

/**
 * Requires Ravel's `Routes` registration system
 * See [`Routes`](#routes) for more information.
 * @example
 * app.routes('./routes/myroutes')
 * @private
 */
require('./core/routes')(Ravel);

/**
 * The base class for Ravel `Resource`. See
 * [`Resource`](#resource) for more information.
 * @example
 * const Resource = require('ravel').Resource
 * class MyResource extends Resource {
 *   // ...
 * }
 * module.exports = MyResource
 */
Ravel.Resource = require('./core/resource').Resource;

/**
 * Requires Ravel's `Resource` registration system
 * See [`Resource`](#resource) for more information.
 * @example
 * app.resource('./resources/myresource')
 * @private
 */
require('./core/resource')(Ravel);

/**
 * Requires Ravel's recursive `Resource` registration system.
 *
 * See [`Resource`](#resource) for more information.
 * @example
 * // recursively load all Resources in a directory
 * app.resources('./resources')
 * @private
 */
require('./core/resources')(Ravel);

/**
 * Requires Ravel's lightweight reflection/metadata system.
 *
 * See `core/reflect` for more information.
 * @example
 * // examine a registered Module, Resource or Route by file path
 * app.reflect('./modules/mymodule.js')
 * @private
 */
require('./core/reflect')(Ravel);

module.exports = Ravel;
