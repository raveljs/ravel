'use strict';

const EventEmitter = require('events').EventEmitter;
const coreSymbols = require('./core/symbols');
const dbSymbols = require('./db/symbols');
const Rest = require('./util/rest');

const sInitialized = Symbol();
const sListening = Symbol();
const sLog = Symbol('log');
const sApplicationError = Symbol('ApplicationError');
const sCWD = Symbol('cwd');

/**
 * This module provides Ravel, a lightweight but powerful framework
 * for the rapid creation of enterprise Node.js applications which
 * scale horizontally with ease and support the latest in web technology.
 */
class Ravel extends EventEmitter {
  /**
   * Creates a new Ravel app instance
   */
  constructor() {
    super();

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
    // database providers
    this.registerSimpleParameter('database providers', true);
    this.set('database providers', []); // we need this parameter actually set before Ravel.init()
    // authorization providers
    this.registerSimpleParameter('authorization providers', true);
    this.set('authorization providers', []); // we need this parameter actually set before Ravel.init()
    // redis parameters
    this.registerSimpleParameter('redis host', true, '0.0.0.0');
    this.registerSimpleParameter('redis port', true, 6379);
    this.registerSimpleParameter('redis password');
    this.registerSimpleParameter('redis max retries', true, 10);
    // Node/koa parameters
    this.registerSimpleParameter('port', true, 8080);
    this.registerSimpleParameter('koa public directory');
    this.registerSimpleParameter('koa view directory');
    this.registerSimpleParameter('koa view engine');
    this.registerSimpleParameter('koa favicon path');
    this.registerSimpleParameter('keygrip keys', true);
    //Passport parameters
    this.registerSimpleParameter('app route', false, '/');
    this.registerSimpleParameter('login route', false, '/login');
  }

  /**
   * @return {String} current working directory of the app using the ravel library, so that client modules can be
   *                  loaded with relative paths.
   */
  get cwd() {
    return this[sCWD];
  }

  /**
   * @return {Logger} return the app instance of Logger.  See util/log.js.
   */
  get log() {
    return this[sLog];
  }

  /**
   * @return {Object} a hash of all built-in error types.
   */
  get ApplicationError() {
    return this[sApplicationError];
  }

  /**
   * @return true iff init() or start() has been called on this app instance
   */
  get initialized() {
    return this[sInitialized];
  }

  /**
   * @return true iff listen() or start() has been called on this app instance
   */
  get listening() {
    return this[sListening];
  }

  /**
   * Initializes the application, when the client is finished
   * supplying parameters and registering modules, resources
   * routes and rooms.
   */
  init() {
    // application configuration is completed in constructor
    this.emit('pre init');

    // load parameters from .ravelrc file, if any
    this[coreSymbols.loadParameters]();

    this[sInitialized] = true;

    this.db = require('./db/database')(this);
    this.kvstore = require('./util/kvstore')(this);

    //App dependencies.
    const http = require('http'); //https will be provided by reverse proxy
    const upath = require('upath');
    const koa = require('koa');
    const session = require('koa-generic-session');
    const compression = require('koa-compressor');
    const redisStore = require('koa-redis');
    const favicon = require('koa-favicon');
    const router = require('koa-router')();

    // configure koa
    const app = koa();
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
      host:this.get('redis host'),
      port:this.get('redis port'),
      options: {
        'no_ready_check': true,
        'retry_strategy': require('./util/kvstore').retryStrategy(this)
      }
    };
    if (this.get('redis password')) {
      sessionStoreArgs.pass = this.get('redis password');
    }
    app.use(session({
      store: redisStore(sessionStoreArgs)
    }));

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
      const root = upath.join(this.cwd, this.get('koa public directory'));
      app.use(require('koa-static')(root, {
        gzip: false // this should be handled by koa-compressor?
      }));
    }

    //initialize authentication/authorization
    require('./auth/passport_init.js')(this, router);

    // basic koa configuration is completed
    this.emit('post config koa', app);

    // init database
    this[dbSymbols.databaseProviderInit]();

    // create registered modules using factories
    this[coreSymbols.moduleInit]();

    this.emit('post module init');

    // create registered resources using factories
    this[coreSymbols.resourceInit](router);

    // create routes using factories
    this[coreSymbols.routesInit](router);

    // include routes as middleware
    app.use(router.routes());

    //Create koa server
    this.server = http.createServer(app.callback());

    // application configuration is completed
    this.emit('post init');
  }

  /**
   * Starts the application. Must be called after initialize()
   */
  listen() {
    return new Promise((resolve, reject) => {
      if (!this[sInitialized]) {
        reject(new this.ApplicationError.NotAllowed('Cannot call Ravel.listen() before Ravel.init()'));
      } else {
        this.emit('pre listen');
        //Start Koa server
        this.server.listen(this.get('port'), () => {
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
  start() {
    this.init();
    return this.listen();
  }

  /**
   * Stops the application. A no op if the server isn't running.
   */
  close() {
    return new Promise((resolve) => {
      // console.log('closing');
      this.emit('end');
      if (!this.server || !this[sListening]) {
        resolve();
      } else {
        this.server.close(() => {
          this.log.info('Application server terminated.');
          this[sListening] = false;
          resolve();
        });
      }
    });
  }
}

/**
 * The following require()s mutate the Ravel class, adding methods and functionality
 */

// add in @inject decorator as static property
require('./core/decorators/inject')(Ravel);

// add httpCodes in as static property
Ravel.httpCodes = require('./util/http_codes');

// add error class as a static property
Ravel.Error = require('./util/application_error').General;

// init database provider prototype
require('./db/database_provider')(Ravel);

// init authorization provider prototype
require('./auth/authorization_provider')(Ravel);

// init parameter system
require('./core/params')(Ravel);

// init module registration (Ravel.module)
require('./core/module')(Ravel);

// init recursive module registration (Ravel.modules)
require('./core/modules')(Ravel);

// init routes registration (Ravel.routes)
require('./core/routes')(Ravel);

// init resource registration (Ravel.resource)
require('./core/resource')(Ravel);

// init recursive resource registration (Ravel.resources)
require('./core/resources')(Ravel);

// init reflection (Ravel.reflect)
require('./core/reflect')(Ravel);

module.exports = Ravel;
