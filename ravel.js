'use strict';

var path = require('path');
var ApplicationError = require('./lib/application_error');
var l = require('./lib/log')('ravel');

module.exports = function() {  
  var Ravel = {
    modules: {},
    ApplicationError:ApplicationError,
    Log:l
  };

  //set up core event emitter
  Ravel._eventEmitter = new (require('events')).EventEmitter();
  Ravel.on = function(e, func) {
    Ravel._eventEmitter.on(e, func);
  };
  
  var moduleFactories = {};
  var resourceFactories = {};
  var routesFactories = {};
  var rooms = {};
  var knownParameters = {};
  var params = {};
  var rest = require('./lib/rest')(Ravel);
  var injector = require('./lib/injector')(Ravel, moduleFactories, module.parent);
  var broadcasMiddleware = require('./lib/broadcast_middleware')(Ravel);
  
  //current working directory of the app using the 
  //ravel library, so that modules can be
  //loaded with relative paths.
  var cwd = process.cwd();
  
  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.registerSimpleParameter = function(key, required) {
    knownParameters[key] = {
      required: required
    };
  };
  
  /**
   * Get a parameter
   *
   * @param {String} key the key for the parameter
   * @throws ApplicationError.NotFound if the parameter is required and not set
   * @return {? | undefined} the parameter value, or undefined if it is not required and not set
   */
  Ravel.get = function(key) {
    if (!knownParameters[key]) {
      throw new ApplicationError.NotFound('Parameter \'' + key + '\' was requested, but is unknown.');
    } else if (knownParameters[key].required && params[key] === undefined) {
      throw new ApplicationError.NotFound('Known required parameter \'' + key + '\' was requested, but hasn\'t been defined yet.');
    } else if (params[key] === undefined) {
      l.l('Optional parameter \'' + key + '\' was requested, but is not defined.');
      return undefined;
    } else {
      return params[key];
    }
  };
  
  /**
   * Set a parameter
   *
   * @param {String} key the key for the parameter
   * @param {?} value the value for the parameter
   * @throws ApplicationError.IllegalValue if key refers to an unregistered parameter
   * @return {?} the parameter value
   */
  Ravel.set = function(key, value) {
    if (knownParameters[key]) {
      params[key] = value;
    } else {
      throw new ApplicationError.IllegalValue('Parameter \'' + key + '\' is not supported.');
    }
  };
  
  /**
   * Register a module with Ravel
   *
   * A module is a pure node.js javascript API consisting of functions with no
   * network-related functionality, suitable for unit-testing.
   *
   * Module should use injection to get what it needs
   *
   * @param {String} name The name of the module
   * @param {String} modulePath The path to the module   
   * 
   */
  Ravel.module = function(name, modulePath) {
    //if a module with this name has already been regsitered, error out
    if (moduleFactories[name]) {
      throw new ApplicationError.DuplicateEntry('Module with name \'' + name + '\' has already been registered.');
    }

    var module = {};
    var methodBuilder = {      
      add: function(methodName, handler) {
        if (module[methodName]) {
          throw new ApplicationError.DuplicateEntry('Method with name \'' + methodName + '\' has already been registered.');
        } else {
          module[methodName] = Ravel.db.createTransactionEntryPoint(handler);
        }
      }
    };

    //save uninitialized module to Ravel.modules
    //so that it can be injected into other 
    //modules and lazily instantiated
    Ravel.modules[name] = module;

    //build module instantiation function
    moduleFactories[name] = function() {
      var moduleInject = require(path.join(cwd, modulePath));
      injector.inject({
        '$L': require('./lib/log')(name),
        '$MethodBuilder': methodBuilder,
        '$KV': Ravel.kvstore
      },moduleInject);
    };
  };

  /**
   * Register a bunch of plain GET express middleware (ejs, static, etc.)
   * with Ravel which will be available, by name, at the given 
   * base path.
   * 
   * @param {String} directoryModulePath the path of the directory module to require(...)
   */
  Ravel.routes = function(routeModulePath) {
    //if a module with this name has already been regsitered, error out
    if (routesFactories[routeModulePath]) {
      throw new ApplicationError.DuplicateEntry('Route module \'' + routeModulePath + '\' has already been registered.');
    }
    var routes = {
      _routes: []
    };    
    var routeBuilder = {
      private: function() {
        return {
          add: function(route, middleware) {
            routes._routes.push({
              isSecure:true,
              route:route,
              middleware:middleware
            });
          }
        };
      },
      public: function() {
        return {
          add: function(route, middleware) {
            routes._routes.push({
              isSecure:false,
              route:route,
              middleware:middleware
            });
          }
        };
      }
    };
    //This will be run in Ravel.start
    routesFactories[routeModulePath] = function(expressApp) {
      injector.inject({
        '$L': require('./lib/log')(routeModulePath),
        '$RouteBuilder': routeBuilder,
        '$Broadcast': Ravel.broadcast,
        '$KV': Ravel.kvstore
      }, require(path.join(cwd, routeModulePath)));
      for (var rk=0;rk<routes._routes.length;rk++) {
        if (routes._routes[rk].isSecure) {          
          expressApp.get(routes._routes[rk].route, Ravel.authorize, routes._routes[rk].middleware);
          l.i('Registering secure route GET ' + routes._routes[rk].route);
        } else {
          expressApp.get(routes._routes[rk].route, routes._routes[rk].middleware);
          l.i('Registering public route GET ' + routes._routes[rk].route);
        }
      }
    };
  };
  
  /**
   * Register a RESTful resource with Ravel
   *
   * A resource is a set of RESTful endpoints for a single Resource
   *
   * @param {String} basePath The base path of the all the Resource's endpoints
   * @param {String} resourcePath the path of the resource module to require(...)
   *
   */
  Ravel.resource = function(basePath, resourcePath) {
    basePath = path.normalize(basePath);
    //if a resource with this name has already been regsitered, error out
    if (resourceFactories[basePath]) {
      throw new ApplicationError.DuplicateEntry('Resource with name \'' + basePath + '\' has already been registered.');
    }
    //Build EndpointBuilder service, which will facilitate things like 
    //$EndpointBuilder.public().getAll(...)
    var endpointBuilder = {
      _methods: {}
    };
    var pub = {}, priv = {};
    var addMethod = function(obj, method, isSecure) {
      obj[method] = function() {
        //all arguments are express middleware of the form function(req, res, next?)
        var middleware = Array.prototype.slice.call(arguments, 0);
        if (endpointBuilder._methods[method]) {
          throw new ApplicationError.DuplicateEntry('Method '+method+' has already been registered with resource \''+basePath+'\'');
        } else {
          endpointBuilder._methods[method] = {
            secure: isSecure,
            middleware: middleware
          };
          return endpointBuilder;
        }
      };
    };    
    addMethod(pub, 'getAll', false);
    addMethod(pub, 'putAll', false);
    addMethod(pub, 'deleteAll', false);    
    addMethod(pub, 'get', false);
    addMethod(pub, 'post', false);
    addMethod(pub, 'put', false);
    addMethod(pub, 'delete', false);
    addMethod(priv, 'getAll', true);
    addMethod(priv, 'putAll', true);
    addMethod(priv, 'deleteAll', true);    
    addMethod(priv, 'get', true);
    addMethod(priv, 'post', true);
    addMethod(priv, 'put', true);
    addMethod(priv, 'delete', true);
    endpointBuilder['public'] = function() {
      return pub;
    };
    endpointBuilder['private'] = function() {
      return priv;
    };

    //build service instantiation function
    resourceFactories[basePath] = function(expressApp) {
      var resourceInject = require(path.join(cwd, resourcePath));
      injector.inject({
        '$L': require('./lib/log')(basePath), 
        '$EndpointBuilder': endpointBuilder,
        '$Rest': rest,
        '$KV': Ravel.kvstore,
        '$Broadcast': Ravel.broadcast,
        '$Transaction': Ravel.db.transactionCreator //not really a real thing, just a marker 
                                                    //for the beginning of a transaction
      }, resourceInject);
      //process all methods and add to express app
      var buildRoute = function(methodType, methodName) {
        var bp = basePath;
        if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
          bp = path.join(basePath, '/:id');
        }
        var args = [bp];
        if (endpointBuilder._methods[methodName]) {
          args.push(broadcasMiddleware);
          if (endpointBuilder._methods[methodName].secure) {
            l.i('Registering secure resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
            args.push(Ravel.authorize);
          } else {
            l.i('Registering public resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
          }
          args = args.concat(endpointBuilder._methods[methodName].middleware);
          expressApp[methodType].apply(expressApp, args);
        } else {
          //l.i('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
          expressApp[methodType](bp, function(req, res) {
            res.status(rest.NOT_IMPLEMENTED).end();
          });
        }
      };
      buildRoute('get', 'getAll');
      buildRoute('put', 'putAll');
      buildRoute('delete', 'deleteAll');
      buildRoute('get', 'get');
      buildRoute('post', 'post');
      buildRoute('put', 'put');
      buildRoute('delete', 'delete');      
    };
  };

  /**
   * Registers a websocket room, with a given authorization function and context
   *
   * @param {String} roomPattern the name of the websocket room
   * @param {Function} authorizationFunction, of the form function(userId, callback(err, {Boolean}authorized))
   */
  Ravel.room = function(roomPattern, authorizationFunction) {
    roomPattern = path.normalize(roomPattern);
    //if a room with this name has already been regsitered, error out
    if (rooms[roomPattern]) {
      throw new ApplicationError.DuplicateEntry('Websocket room with path \'' + roomPattern + '\' has already been registered.');
    } else if (typeof authorizationFunction !== 'function') {
      throw new ApplicationError.IllegalValue('Authorization function for path \'' + roomPattern + '\' must be a function.');
    }
    var params = [];
    var paramMatcher = new RegExp(/\:(\w+)/g);
    var paramMatch = paramMatcher.exec(roomPattern);
    while (paramMatch !== null) {
      params.push(paramMatch[1]);
      paramMatch = paramMatcher.exec(roomPattern);
    }
    rooms[roomPattern] = {
      name: roomPattern,
      params: params,
      regex: new RegExp(roomPattern.replace(/\:(\w+)/g,'(\\w+)')),
      authorize: authorizationFunction
    };
    l.i('Creating websocket room with pattern ' + roomPattern);
  };
  
  /**
   * Start the application
   */
  Ravel.start = function() {
    Ravel._eventEmitter.emit('start');
    Ravel.db = require('./lib/database')(Ravel);
    Ravel.kvstore = require('./lib/kvstore')('ravel_prefix', Ravel);

    //App dependencies.
    var express = require('express');
    var session = require('express-session');
    var compression = require('compression');
    var favicon = require('serve-favicon');
    var cookieParser = require('cookie-parser');
    var http = require('http'); //https will be provided by reverse proxy
    var path = require('path');
    var passport = require('passport');
    var Primus = require('primus.io');
    var ExpressRedisStore = require('connect-redis')(session);
    
    //configure express
    var app = express();
    app.disable('x-powered-by');
    //configure redis session store
    var sessionStoreArgs = {
      host:Ravel.get('redis host'),
      port:Ravel.get('redis port'),
      db:0 //we stick to 0 because clustered redis doesn't support multiple dbs
    };
    if (Ravel.get('redis password')) {
      sessionStoreArgs.pass = Ravel.get('redis password');
    }
    var expressSessionStore = new ExpressRedisStore(sessionStoreArgs);

    app.set('domain', Ravel.get('node domain'));
    app.set('port', Ravel.get('node port'));
    app.set('app domain', Ravel.get('app domain'));
    app.set('app port', Ravel.get('app port'));
    app.enable('trust proxy');
    //configure views
    app.set('views', path.join(cwd, Ravel.get('express view directory')));
    app.set('view engine', Ravel.get('express view engine'));
    //app.use(require('morgan')('dev')); //uncomment to see HTTP requests
    app.use(compression());
    if (Ravel.get('express favicon path')) {
      app.use(favicon(path.join(cwd, Ravel.get('express favicon path'))));
    }
    app.use(require('body-parser').json());
    app.use(require('method-override')());
    app.use(cookieParser(Ravel.get('express session secret')));
    app.use(session({
      store: expressSessionStore,
      secret:Ravel.get('express session secret'),
      resave:true,
      saveUninitialized:true
    }));
    //cross-site scripting protection, with mobile app support
    app.use(require('./lib/csrf')(Ravel));
    app.use(function(req, res, next){
      if (req.csrfToken) {
        res.locals.token = req.csrfToken();
      }
      next();
    });
    app.use(express.static(path.join(cwd, Ravel.get('express public directory'))));
    app.use(require('connect-flash')());
    
    //initialize passport authentication      
    app.use(passport.initialize());
    app.use(passport.session());  
    require('./lib/passport_init.js')(Ravel, app, injector, passport);
    Ravel.authorize = require('./lib/authorize_request')(Ravel, true);
    
    //Create ExpressJS server
    var server = http.createServer(app);

    //Pass server to Primus to get it going on the same port
    //Initialize primus.io with room handling, etc.
    var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });
    //primus_init produces a configured, cluster-ready broadcasting library
    var broadcast = require('./lib/primus_init.js')(Ravel, primus, expressSessionStore, require('./lib/websocket_room_resolver')(rooms));
    //public version of broadcast, for client use
    Ravel.broadcast = {
      emit: broadcast.emit
    };
        
    //create registered modules using factories
    for (var moduleName in moduleFactories) {
      moduleFactories[moduleName]();
    }

    //create registered resources using factories
    for (var resourceName in resourceFactories) {
      resourceFactories[resourceName](app);
    }

    //create routes using factories
    for (var routesName in routesFactories) {
      routesFactories[routesName](app);
    }

    //Start ExpressJS server
    server.listen(Ravel.get('node port'), function(){
      l.i('Application server at ' + Ravel.get('node domain') + ' listening on port ' + Ravel.get('node port'));
    });
  };
  
  //Register known ravel parameters
  //database parameters
  Ravel.registerSimpleParameter('database providers', true);
  Ravel.set('database providers', []);
  //redis parameters
  Ravel.registerSimpleParameter('redis host', true);
  Ravel.registerSimpleParameter('redis port', true);
  Ravel.registerSimpleParameter('redis password');
  Ravel.registerSimpleParameter('websocket message cache time');
  //Node/express parameters
  Ravel.registerSimpleParameter('app domain', true);
  Ravel.registerSimpleParameter('app port', true);
  Ravel.registerSimpleParameter('node domain', true);
  Ravel.registerSimpleParameter('node port', true);
  Ravel.registerSimpleParameter('express public directory', true);
  Ravel.registerSimpleParameter('express view directory', true);
  Ravel.registerSimpleParameter('express view engine', true);
  Ravel.registerSimpleParameter('express favicon path');
  Ravel.registerSimpleParameter('express session secret', true);
  Ravel.registerSimpleParameter('disable json vulnerability protection');
  //Google OAuth parameters
  Ravel.registerSimpleParameter('google oauth2 web client id', true);
  Ravel.registerSimpleParameter('google oauth2 web client secret', true);
  Ravel.registerSimpleParameter('google oauth2 android client id');
  Ravel.registerSimpleParameter('google oauth2 ios client id');
  Ravel.registerSimpleParameter('google oauth2 ios client secret');
  //Passport parameters
  Ravel.registerSimpleParameter('app route', true);
  Ravel.registerSimpleParameter('login route', true);
  Ravel.registerSimpleParameter('get user function', true);
  Ravel.registerSimpleParameter('get or create user function', true);
  
  return Ravel;
};
