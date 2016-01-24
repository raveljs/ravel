'use strict';

let EventEmitter = require('events').EventEmitter;

class Ravel extends EventEmitter {
  constructor() {
    super();
  }
}

module.exports = Ravel;

// module.exports = function() {
//   var initialized, listening;
//
//   var Ravel = new (require('events')).EventEmitter();
//
//   Ravel.modules = {};
//   Ravel.ApplicationError = require('./util/application_error');
//
//   //current working directory of the app using the
//   //ravel library, so that client modules can be
//   //loaded with relative paths.
//   Ravel.cwd = process.cwd();
//
//   Ravel._moduleFactories = {};
//   Ravel._resourceFactories = {};
//   Ravel._routesFactories = {};
//   Ravel._rooms = {};
//   Ravel._knownParameters = {};
//   Ravel._params = {};
//
//   //init database provider prototype
//   require('./db/database_provider')(Ravel);
//
//   //init authorization provider prototype
//   require('./auth/authorization_provider')(Ravel);
//   //init parameter system
//   require('./core/params')(Ravel, Ravel._knownParameters, Ravel._params);
//   //init logging system
//   require('./util/log')(Ravel);
//
//   //init dependency injection utility, which is used by most everything else
//   var injector = require('./util/injector')(
//     Ravel, Ravel._moduleFactories, module.parent);
//   Ravel._injector = injector;
//
//   //init module registration (Ravel.module)
//   require('./core/module')(Ravel, Ravel._moduleFactories, injector);
//
//   //init recursive module registration (Ravel.modules)
//   require('./core/modules')(Ravel);
//
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
//   //initialize custom error registration
//   require('./core/error.js')(Ravel);
//
//   //initialize authentication/authorization
//   require('./auth/passport_init.js')(Ravel, injector);
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
//     Ravel.emit('pre module init');
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
//   //Register known ravel parameters
//   //database providers
//   Ravel.registerSimpleParameter('database providers', true);
//   Ravel.set('database providers', []);
//   //authorization providers
//   Ravel.registerSimpleParameter('authorization providers', true);
//   Ravel.set('authorization providers', []);
//   //redis parameters
//   Ravel.registerSimpleParameter('redis host', true);
//   Ravel.registerSimpleParameter('redis port', true);
//   Ravel.registerSimpleParameter('redis password');
//   Ravel.registerSimpleParameter('websocket message cache time');
//   //Node/express parameters
//   Ravel.registerSimpleParameter('port', true);
//   Ravel.set('port', 8080);
//   Ravel.registerSimpleParameter('express public directory');
//   Ravel.registerSimpleParameter('express view directory');
//   Ravel.registerSimpleParameter('express view engine');
//   Ravel.registerSimpleParameter('express favicon path');
//   Ravel.registerSimpleParameter('express session secret', true);
//   Ravel.registerSimpleParameter('disable json vulnerability protection');
//
//   return Ravel;
// };
/**
 * This module provides Ravel, a lightweight framework
 * for the rapid creation of MVPs which scale horizontally
 * with ease and support the latest in web technology.
 */
