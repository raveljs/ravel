'use strict';

const AsyncEventEmitter = require('./util/event_emitter');
const coreSymbols = require('./core/symbols');
const Rest = require('./util/rest');

const sInitialized = Symbol('isInitialized');
const sListening = Symbol('isListening');
const sLog = Symbol('$log');
const sErr = Symbol('$err');
const sCWD = Symbol('cwd');
const sCallback = Symbol('callback');
const sServer = Symbol('server');
const sUncaughtRejections = Symbol('uncaughtRejections');
const sKeygripKeys = Symbol('keygripKeys');
const sKeygrip = Symbol('keygrip');

/**
 * This class provides Ravel, a lightweight but powerful framework
 * for the rapid creation of enterprise Node.js applications which
 * scale horizontally with ease and support the latest in web technology.
 *
 * @example
 * const Ravel = require('ravel');
 * const app = new Ravel();
 */
class Ravel extends AsyncEventEmitter {
  /**
   * Creates a new Ravel app instance.
   *
   * @example
   * const Ravel = require('ravel');
   * const app = new Ravel();
   */
  constructor () {
    super();

    this[sUncaughtRejections] = 0;
    this[sInitialized] = false;
    this[sListening] = false;
    this[sKeygripKeys] = [];

    // how we store modules for dependency injection
    this[coreSymbols.modules] = Object.create(null);
    // how we store routes for later access
    this[coreSymbols.routes] = Object.create(null);
    // how we store resources for later access
    this[coreSymbols.resource] = Object.create(null);
    // how we store middleware for dependency injection
    this[coreSymbols.middleware] = Object.create(null);

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
    // Allows us to detect duplicate binds
    this[coreSymbols.endpoints] = new Map();
    // a list of known modules, resources and routes so that metadata can be retrieved from them
    this[coreSymbols.knownComponents] = Object.create(null);

    // init errors
    this[sErr] = require('./util/application_error');

    // init logging system
    this[sLog] = new (require('./util/log'))(this);

    // init dependency injection utility, which is used by most everything else
    this[coreSymbols.injector] = new (require('./core/injector'))(this,
      module.parent !== null ? module.parent : module);

    // Register known ravel parameters
    // redis parameters
    this.registerParameter('redis host', false);
    this.registerParameter('redis port', true, 6379);
    this.registerParameter('redis password');
    this.registerParameter('redis max retries', true, 10);
    this.registerParameter('redis keepalive interval', true, 1000);
    // Node/koa parameters
    this.registerParameter('port', true, 8080);
    this.registerParameter('koa public directory');
    this.registerParameter('koa favicon path');
    this.registerParameter('keygrip keys', true);
    // session parameters
    this.registerParameter('session key', true, 'koa.sid');
    this.registerParameter('session max age', true, null);
    // Passport parameters
    this.registerParameter('app route', false, '/');
    this.registerParameter('login route', false, '/login');
  }

  /**
   * The current working directory of the app using the `ravel` library.
   *
   * @type String
   */
  get cwd () {
    return this[sCWD];
  }

  /**
   * Return the app instance of Logger.
   * See [`Logger`](#logger) for more information.
   *
   * @type Logger
   * @example
   * app.$log.error('Something terrible happened!');
   */
  get $log () {
    return this[sLog];
  }

  /**
   * A hash of all built-in error types. See [`$err`](#$err) for more information.
   *
   * @type Object
   */
  get $err () {
    return this[sErr];
  }

  /**
   * Value is `true` iff init() or start() has been called on this app instance.
   *
   * @type boolean
   */
  get initialized () {
    return this[sInitialized];
  }

  /**
   * Value is `true` iff `listen()` or `start()` has been called on this app instance.
   *
   * @type boolean
   */
  get listening () {
    return this[sListening];
  }

  /**
   * The underlying koa callback for this Ravel instance.
   * Useful for [testing](#testing-ravel-applications) with `supertest`.
   * Only available after `init()` (i.e. use `@postinit`).
   *
   * @type {Function}
   */
  get callback () {
    return this[sCallback];
  }

  /**
   * The underlying HTTP server for this Ravel instance.
   * Only available after `init()` (i.e. use `@postinit`).
   * Useful for [testing](#testing-ravel-applications) with `supertest`.
   *
   * @type {http.Server}
   */
  get server () {
    return this[sServer];
  }

  /**
   * The underlying Keygrip instance for cookie signing.
   *
   * @type {Keygrip}
   */
  get keys () {
    return this[sKeygrip];
  }

  /**
   * Initializes the application, when the client is finished
   * supplying parameters and registering modules, resources
   * routes and rooms.
   *
   * @example
   * await app.init();
   */
  async init () {
    // application configuration is completed in constructor
    await this.emit('pre init');

    // log uncaught errors to prevent ES6 promise error swallowing
    // https://www.hacksrus.net/blog/2015/08/a-solution-to-swallowed-exceptions-in-es6s-promises/
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (err) => {
      this[sUncaughtRejections] += 1;
      const message = `Detected uncaught error in promise: \n ${err ? err.stack : err}`;
      if (this[sUncaughtRejections] >= 10) {
        this.$log.error(message);
        this.$log.error(`Encountered ${this[sUncaughtRejections]} or more uncaught rejections. Re-run ` +
          'with full logging output for more information: app.set(\'log level\', app.$log.TRACE);');
      } else {
        this.$log.debug(message);
      }
    });

    // load parameters from .ravelrc.json file, if any
    await this.emit('pre load parameters');
    this[coreSymbols.loadParameters]();
    await this.emit('post load parameters');

    this[sInitialized] = true;

    this.$db = require('./db/database')(this);
    this.$kvstore = require('./util/kvstore')(this);

    // App dependencies.
    const http = require('http'); // https will be provided by reverse proxy
    const upath = require('upath');
    const Koa = require('koa');
    const session = require('koa-session');
    const compression = require('koa-compress');
    const favicon = require('koa-favicon');
    const router = new (require('koa-router'))();

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
    this[sKeygripKeys] = [...this.get('keygrip keys')];
    this[sKeygrip] = require('keygrip')(this[sKeygripKeys], 'sha256', 'base64');
    app.keys = this[sKeygrip];
    app.use(session({
      store: new (require('./util/redis_session_store'))(this),
      key: this.get('session key'),
      maxAge: Number(this.get('session max age')),
      overwrite: true, /* (boolean) can overwrite or not (default true) */
      httpOnly: true, /* (boolean) httpOnly or not (default true) */
      signed: true, /* (boolean) signed or not (default true) */
      rolling: false /* (boolean) Force a session identifier cookie to be set on every response.
                         The expiration is reset to the original maxAge, resetting the expiration
                         countdown. default is false */
    }, app));

    // favicon
    if (this.get('koa favicon path')) {
      app.use(favicon(upath.join(this.cwd, this.get('koa favicon path'))));
    }

    // static file serving
    if (this.get('koa public directory')) {
      const koaStatic = require('koa-static');
      const root = upath.join(this.cwd, this.get('koa public directory'));
      app.use(koaStatic(root, {
        gzip: false // this should be handled by koa-compressor?
      }));
    }

    // initialize authentication/authentication
    require('./auth/passport_init.js')(this, router);

    // basic koa configuration is completed
    await this.emit('post config koa', app);

    // create registered modules using factories
    this[coreSymbols.moduleInit]();

    await this.emit('post module init');

    await this.emit('pre routes init', app);

    // create registered resources using factories
    this[coreSymbols.resourceInit](router);

    // create routes using factories
    this[coreSymbols.routesInit](router);

    // include routes as middleware
    app.use(router.routes());
    app.use(router.allowedMethods());

    // Create koa callback and server
    this[sCallback] = app.callback();
    this[sServer] = http.createServer(this[sCallback]);

    // application configuration is completed
    await this.emit('post init');
  }

  /**
   * Rotate a new cookie signing key in, and the oldest key out.
   *
   * @param {string} newKey - The new key.
   */
  rotateKeygripKey (newKey) {
    this[sKeygripKeys].unshift(newKey);
    this[sKeygripKeys].pop();
  }

  /**
   * Starts the application. Must be called after `initialize()`.
   *
   * @example
   * await app.listen();
   */
  async listen () {
    if (!this[sInitialized]) {
      throw new this.$err.NotAllowed('Cannot call Ravel.listen() before Ravel.init()');
    } else {
      await this.emit('pre listen');
      return new Promise((resolve, reject) => {
        // validate parameters
        this[coreSymbols.validateParameters]();
        // Start Koa server
        this[sServer].listen(this.get('port'), () => {
          this.$log.info('Application server listening on port ' + this.get('port'));
          this[sListening] = true;
          this.emit('post listen');
          resolve();
        });
      });
    }
  }

  /**
   * Intializes and starts the application.
   *
   * @example
   * await app.start();
   */
  async start () {
    await this.init();
    return this.listen();
  }

  /**
   * Stops the application. A no op if the server isn't running.
   *
   * @example
   * await app.close();
   */
  async close () {
    await this.emit('end');
    if (this[sServer] && this[sListening]) {
      return new Promise((resolve) => {
        this[sServer].close(() => {
          this.$log.info('Application server terminated.');
          this[sListening] = false;
          resolve();
        });
      });
    }
  }
}

/**
 * The base class of Ravel `Error`s, which associate
 * HTTP status codes with your custom errors.
 * @example
 * const Ravel = require('ravel');
 * class NotFoundError extends Ravel.Error {
 *   constructor (msg) {
 *     super(msg, Ravel.httpCodes.NOT_FOUND);
 *   }
 * }
 */
Ravel.Error = require('./util/application_error').General;

/**
 * The base class for Ravel `DatabaseProvider`s. See
 * [`DatabaseProvider`](#databaseprovider) for more information.
 * @example
 * const DatabaseProvider = require('ravel').DatabaseProvider;
 * class MySQLProvider extends DatabaseProvider {
 *   // ...
 * }
 */
Ravel.DatabaseProvider = require('./db/database_provider').DatabaseProvider;

/**
 * Return a list of all registered `DatabaseProvider`s. See
 * [`DatabaseProvider`](#databaseprovider) for more information.
 * @returns {Array} a list of `DatabaseProvider`s
 * @private
 */
require('./db/database_provider')(Ravel);

/**
 * The base class for Ravel `AuthenticationProvider`s. See
 * [`AuthenticationProvider`](#authenticationprovider) for more information.
 * @example
 * const AuthenticationProvider = require('ravel').AuthenticationProvider;
 * class GoogleOAuth2Provider extends AuthenticationProvider {
 *   // ...
 * }
 */
Ravel.AuthenticationProvider = require('./auth/authentication_provider').AuthenticationProvider;

/**
 * Return a list of all registered `AuthenticationProvider`s. See
 * [`AuthenticationProvider`](#authenticationprovider) for more information.
 * @returns {Array} a list of `AuthenticationProvider`s
 * @private
 */
require('./auth/authentication_provider')(Ravel);

/*
 * Makes the `@inject` decorator available as `Ravel.inject`
 * @example
 * const Ravel = require('ravel');
 * const inject = Ravel.inject;
 */
Ravel.inject = require('./core/decorators/inject');

/*
 * Makes the `@autoinject` decorator available as `Ravel.autoinject`
 * @example
 * const Ravel = require('ravel');
 * const autoinject = Ravel.autoinject;
 */
Ravel.autoinject = require('./core/decorators/autoinject');

/**
 * A dictionary of useful http status codes. See [HTTPCodes](#httpcodes) for more information.
 * @example
 * const Ravel = require('ravel');
 * console.log(Ravel.httpCodes.NOT_FOUND);
 */
Ravel.httpCodes = require('./util/http_codes');

/**
 * Requires Ravel's parameter system
 * See `core/params` for more information.
 * @example
 * app.registerParameter('my parameter', true, 'default value');
 * const value = app.get('my parameter');
 * app.set('my parameter', 'another value');
 * @private
 */
require('./core/params')(Ravel);

/**
 * The base decorator for Ravel `Module`s. See
 * [`Module`](#module) for more information.
 * @example
 * const Module = require('ravel').Module;
 * @Module
 * class MyModule {
 *   // ...
 * }
 * module.exports = MyModule;
 */
Ravel.Module = require('./core/module').Module;

/**
 * Requires Ravel's `Module` retrieval and registration system
 * See [`Module`](#module) for more information.
 * @example
 * app.scan('./modules/mymodule');
 * @private
 */
require('./core/module')(Ravel);

/**
 * Requires Ravel's recursive component registration system.
 *
 * See [`Module`](#module), [`Resource`](#resource) and [`Routes`](#routes) for more information.
 * @example
 * // recursively load all Modules in a directory
 * app.scan('./modules');
 * // a Module 'modules/test.js' in ./modules can be injected as `@inject('test')`
 * // a Module 'modules/stuff/test.js' in ./modules can be injected as `@inject('stuff.test')`
 * @example
 * // recursively load all Resources in a directory
 * app.scan('./resources');
 * // recursively load all Resources in a directory
 * app.scan('./routes');
 * @private
 */
require('./core/scan')(Ravel);

/**
 * The base class for Ravel `Routes`. See
 * [`Routes`](#routes) for more information.
 * @example
 * const Routes = require('ravel').Routes;
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // ...
 * }
 * module.exports = MyRoutes;
 */
Ravel.Routes = require('./core/routes').Routes;

/**
 * Requires Ravel's `Routes` registration system
 * See [`Routes`](#routes) for more information.
 * @example
 * app.routes('./routes/myroutes');
 * @private
 */
require('./core/routes')(Ravel);

/**
 * The base class for Ravel `Resource`. See
 * [`Resource`](#resource) for more information.
 * @example
 * const Resource = require('ravel').Resource;
 * // &#64;Resource('/')
 * class MyResource {
 *   // ...
 * }
 * module.exports = MyResource;
 */
Ravel.Resource = require('./core/resource').Resource;

/**
 * Requires Ravel's `Resource` registration system
 * See [`Resource`](#resource) for more information.
 * @example
 * app.resource('./resources/myresource');
 * @private
 */
require('./core/resource')(Ravel);

/**
 * Requires Ravel's lightweight reflection/metadata system.
 *
 * See `core/reflect` for more information.
 * @example
 * // examine a registered Module, Resource or Route by file path
 * app.reflect('./modules/mymodule.js');
 * @private
 */
require('./core/reflect')(Ravel);

module.exports = Ravel;
