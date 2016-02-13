'use strict';

/**
 * This module provides Ravel, a lightweight framework
 * for the rapid creation of MVPs which scale horizontally
 * with ease and support the latest in web technology.
 */

const EventEmitter = require('events').EventEmitter;
const coreSymbols = require('./core/symbols');

class Ravel extends EventEmitter {
  constructor() {
    super();

    this._initialized = false;
    this._listening = false;

    this[coreSymbols.modules] = Object.create(null);

    // current working directory of the app using the
    // ravel library, so that client modules can be
    // loaded with relative paths.
    this.cwd = process.cwd();

    this[coreSymbols.knownParameters] = Object.create(null);
    this[coreSymbols.params] = Object.create(null);
    // a list of registered module factories which haven't yet been instantiated
    this[coreSymbols.moduleFactories] = Object.create(null);
    this[coreSymbols.resourceFactories] = Object.create(null);
    this._routesFactories = Object.create(null);

    // init errors
    this.ApplicationError = require('./util/application_error');

    // init logging system
    this.Log = new (require('./util/log'))(this);

    // init dependency injection utility, which is used by most everything else
    this._injector = new (require('./util/injector'))(this, module.parent);

    // Register known ravel parameters
    // database providers
    this.registerSimpleParameter('database providers', true);
    this.set('database providers', []);
    // authorization providers
    this.registerSimpleParameter('authorization providers', true);
    this.set('authorization providers', []);
    // redis parameters
    this.registerSimpleParameter('redis host', true);
    this.registerSimpleParameter('redis port', true);
    this.registerSimpleParameter('redis password');
    this.registerSimpleParameter('websocket message cache time');
    // Node/koa parameters
    this.registerSimpleParameter('port', true);
    this.set('port', 8080);
    this.registerSimpleParameter('koa public directory');
    this.registerSimpleParameter('koa view directory');
    this.registerSimpleParameter('koa view engine');
    this.registerSimpleParameter('koa favicon path');
    this.registerSimpleParameter('keygrip keys', true);
    //Passport parameters
    this.registerSimpleParameter('app route', false);
    this.set('app route', '/');
    this.registerSimpleParameter('login route', false);
    this.set('login route', '/login');
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
    this._loadParameters();

    this._initialized = true;

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
    app.use(require('./util/rest').errorHandler());

    // enable gzip compression
    app.use(compression());

    // configure redis session store
    app.keys = this.get('keygrip keys');
    const sessionStoreArgs = {
      host:this.get('redis host'),
      port:this.get('redis port'),
      db:0 //we stick to 0 because clustered redis doesn't support multiple dbs
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
      app.use(views(this.get('koa view directory'), {
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
    require('./auth/passport_init.js')(this);

    // basic koa configuration is completed
    Ravel.emit('post config koa', app);

    //Create koa server
    Ravel._server = http.createServer(app.callback());

    // init database
    this._databaseProviderInit();

    // create registered modules using factories
    this._moduleInit();

    // create registered resources using factories
    this._resourceInit(router);

    // create routes using factories
    this._routesInit(router);

    // add routes to koa
    koa.use(router.routes());
    koa.use(router.allowedMethods());

    // application configuration is completed
    this.emit('post init');
  }

  /**
   * Starts the application. Must be called after initialize()
   */
  listen(done) {
    if (!this._initialized) {
      throw new this.ApplicationError.NotAllowed('Cannot call Ravel.listen() before Ravel.init()');
    }
    //Start Koa server
    this._server.listen(this.get('port'), function(){
      this.Log.info('Application server listening on port ' + this.get('port'));
      this.emit('listening');
      this._listening = true;
      if (typeof done === 'function') {
        done();
      }
    });
  }

  /**
   * Intializes and starts the application.
   */
  start(done) {
    this.init();
    this.listen(done);
  }

  /**
   * Stops the application. A no op if the server isn't running.
   */
  close(done) {
    if (!this._server || !this._listening) {
      if (typeof done === 'function') {
        done();
      }
    } else {
      this._server.close(function() {
        this.Log.info('Application server terminated.');
        this._listening = false;
        if (typeof done === 'function') {
          done();
        }
      });
    }
  }
}

// add in @inject decorator as static property
require('./util/inject')(Ravel);

// add in @before decorator as static property
require('./util/before')(Ravel);

// add in @authconfig decorator as static property
require('./auth/authconfig')(Ravel);

// init database provider prototype
require('./db/database_provider')(Ravel);

// init authorization provider prototype
require('./auth/authorization_provider')(Ravel);

// init authorization middleware
require('./auth/authorize_request')(Ravel);

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

// initialize custom error registration
require('./core/error')(Ravel);

module.exports = Ravel;
