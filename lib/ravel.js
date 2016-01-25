'use strict';

/**
 * This module provides Ravel, a lightweight framework
 * for the rapid creation of MVPs which scale horizontally
 * with ease and support the latest in web technology.
 */

const EventEmitter = require('events').EventEmitter;

class Ravel extends EventEmitter {
  constructor() {
    super();

    this._initialized = false;
    this._listening = false;

    this._modules = Object.create(null);

    //current working directory of the app using the
    //ravel library, so that client modules can be
    //loaded with relative paths.
    this.cwd = process.cwd();

    this._knownParameters = Object.create(null);
    this._params = Object.create(null);
    //a list of registered module factories which haven't yet been instantiated
    this._moduleFactories = Object.create(null);
    this._resourceFactories = Object.create(null);
    this._routesFactories = Object.create(null);
    this._rooms = Object.create(null);

    //init errors
    this.ApplicationError = require('./util/application_error');

    //init logging system
    this.Log = new (require('./util/log'))(this);

    //init dependency injection utility, which is used by most everything else
    this._injector = new (require('./util/injector'))(this, module.parent);

    //Register known ravel parameters
    //database providers
    this.registerSimpleParameter('database providers', true);
    this.set('database providers', []);
    //authorization providers
    this.registerSimpleParameter('authorization providers', true);
    this.set('authorization providers', []);
    //redis parameters
    this.registerSimpleParameter('redis host', true);
    this.registerSimpleParameter('redis port', true);
    this.registerSimpleParameter('redis password');
    this.registerSimpleParameter('websocket message cache time');
    //Node/express parameters
    this.registerSimpleParameter('port', true);
    this.set('port', 8080);
    this.registerSimpleParameter('express public directory');
    this.registerSimpleParameter('express view directory');
    this.registerSimpleParameter('express view engine');
    this.registerSimpleParameter('express favicon path');
    this.registerSimpleParameter('express session secret', true);
    this.registerSimpleParameter('disable json vulnerability protection');
  }
}
//add in @inject decorator as static property
Ravel.inject = require('./util/inject');

//   //init database provider prototype
//   require('./db/database_provider')(Ravel);
//
//   //init authorization provider prototype
//   require('./auth/authorization_provider')(Ravel);

//init parameter system
require('./core/params')(Ravel);

//init module registration (Ravel.module)
require('./core/module')(Ravel);

//init recursive module registration (Ravel.modules)
require('./core/modules')(Ravel);

//   //init routes registration (Ravel.routes)
//   require('./core/routes')(Ravel, Ravel._routesFactories, injector);
//
//   //init resource registration (Ravel.resource)
//   require('./core/resource')(Ravel, Ravel._resourceFactories, injector);
//
//   //init recursive resource registration (Ravel.resources)
//   require('./core/resources')(Ravel);
//
//   //init websocket room registration (Ravel.room)
//   require('./core/room')(Ravel, Ravel._rooms);
//
//initialize custom error registration
require('./core/error')(Ravel);

//   //initialize authentication/authorization
//   require('./auth/passport_init.js')(Ravel, injector);

module.exports = Ravel;

// module.exports = function() {
//
//
//
//
//
//   /**
//    * Initializes the application, when the client is finished
//    * supplying parameters and registering modules, resources
//    * routes and rooms.
//    */
//   Ravel.init = function() {
//     //application configuration is completed
//     Ravel.emit('pre init');
//
//     initialized = true;
//     Ravel.db = require('./db/database')(Ravel);
//     Ravel.kvstore = require('./util/kvstore')(Ravel);
//
//     //App dependencies.
//     var express = require('express');
//     var session = require('express-session');
//     var compression = require('compression');
//     var favicon = require('serve-favicon');
//     var cookieParser = require('cookie-parser');
//     var http = require('http'); //https will be provided by reverse proxy
//     var path = require('path');
//     var Primus = require('primus.io');
//     var ExpressRedisStore = require('connect-redis')(session);
//
//     //configure express
//     var app = express();
//     app.disable('x-powered-by');
//     //configure redis session store
//     var sessionStoreArgs = {
//       host:Ravel.get('redis host'),
//       port:Ravel.get('redis port'),
//       db:0 //we stick to 0 because clustered redis doesn't support multiple dbs
//     };
//     if (Ravel.get('redis password')) {
//       sessionStoreArgs.pass = Ravel.get('redis password');
//     }
//     var expressSessionStore = new ExpressRedisStore(sessionStoreArgs);
//
//     app.set('strict routing', true);
//     app.enable('trust proxy');
//     if (Ravel.get('express view engine') && Ravel.get('express view directory')) {
//       //require view engine
//       app.engine(Ravel.get('express view engine'),
//         require(
//           path.join(Ravel.cwd, 'node_modules', Ravel.get('express view engine'))
//         ).__express
//       );
//       //configure views
//       app.set('views', path.join(Ravel.cwd, Ravel.get('express view directory')));
//       app.set('view engine', Ravel.get('express view engine'));
//     }
//     //app.use(require('morgan')('dev')); //uncomment to see HTTP requests
//     app.use(compression());
//     if (Ravel.get('express favicon path')) {
//       app.use(favicon(path.join(Ravel.cwd, Ravel.get('express favicon path'))));
//     }
//     app.use(require('body-parser').json());
//     app.use(cookieParser(Ravel.get('express session secret')));
//     app.use(session({
//       store: expressSessionStore,
//       secret:Ravel.get('express session secret'),
//       resave:true,
//       saveUninitialized:true
//     }));
//     if (Ravel.get('express public directory')) {
//       app.use(express.static(path.join(Ravel.cwd, Ravel.get('express public directory'))));
//     }
//     app.use(require('connect-flash')());
//
//     //basic express configuration is completed
//     Ravel.emit('post config express', app);
//
//     //Create ExpressJS server
//     Ravel._server = http.createServer(app);
//
//     //Pass server to Primus to get it going on the same port
//     //Initialize primus.io with room handling, etc.
//     var primus = new Primus(Ravel._server, { transformer: 'engine.io', parser: 'JSON' });
//     //primus_init produces a configured, cluster-ready broadcasting library
//     var broadcast = require('./ws/primus_init.js')(
//       Ravel, injector, primus, expressSessionStore, require('./ws/util/websocket_room_resolver')(Ravel._rooms));
//     //public version of broadcast, for client use
//     Ravel.broadcast = {
//       emit: broadcast.emit
//     };
//
//     //create registered modules using factories
//     this._moduleInit();
//
//     //create registered resources using factories
//     for (var resourceName in Ravel._resourceFactories) {
//       Ravel._resourceFactories[resourceName](app);
//     }
//
//     //create routes using factories
//     for (var routesName in Ravel._routesFactories) {
//       Ravel._routesFactories[routesName](app);
//     }
//
//     //application configuration is completed
//     Ravel.emit('post init');
//   };
//
//   /**
//    * Starts the application. Must be called after initialize()
//    */
//   Ravel.listen = function(done) {
//     if (!initialized) {
//       throw new Ravel.ApplicationError.NotAllowed('Cannot call Ravel.listen() before Ravel.init()');
//     }
//     //Start ExpressJS server
//     Ravel._server.listen(Ravel.get('port'), function(){
//       Ravel.Log.info('Application server listening on port ' + Ravel.get('port'));
//       Ravel.emit('listening');
//       listening = true;
//       if (typeof done === 'function') {
//         done();
//       }
//     });
//   };
//
//   /**
//    * Intializes and starts the application.
//    */
//   Ravel.start = function(done) {
//     Ravel.init();
//     Ravel.listen(done);
//   };
//
//   /**
//    * Stops the application. A no op if the server isn't running.
//    */
//   Ravel.close = function(done) {
//     if (!Ravel._server || !listening) {
//       if (typeof done === 'function') {
//         done();
//       }
//     } else {
//       Ravel._server.close(function() {
//         Ravel.Log.info('Application server terminated.');
//         listening = false;
//         if (typeof done === 'function') {
//           done();
//         }
//       });
//     }
//   };
//
//
//   return Ravel;
// };
