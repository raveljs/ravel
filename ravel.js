var path = require('path');
var ApplicationError = require('./lib/application_error');
var l = require('./lib/log')('ravel');

module.exports = function() {  
  var Ravel = {
    modules: {}
  };
  
  var moduleFactories = {};
  var serviceFactories = {};
  var rooms = {};
  var knownParameters = {};
  var params = {};
  var rest = require('./lib/rest')(Ravel);
  var injector = require('./lib/injector')(Ravel, moduleFactories, module.parent);
  
  //Change __dirname to current working directory of the
  //app using the ravel library, so that modules can be
  //loaded with relative paths.
  __dirname = process.cwd();
  
  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.registerSimpleParameter = function(key, required) {
    knownParameters[key] = {
      required: required
    }
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
      throw new ApplicationError.NotFound('Parameter \'' + name + '\' was requested, but is unknown.');
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
   * @throws ApplicationError.IllegalValueError if key refers to an unregistered parameter
   * @return {?} the parameter value
   */
  Ravel.set = function(key, value) {
    if (knownParameters[key]) {
      params[key] = value;
    } else {
      throw new ApplicationError.IllegalValueError('Parameter \'' + key + '\' is not supported.');
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
      throw new ApplicationError.DuplicateEntryError('Module with name \'' + name + '\' has already been registered.');
    }

    var module = {};
    var methodBuilder = {      
      add: function(methodName, handler) {
        if (module[methodName]) {
          throw new ApplicationError.DuplicateEntryError('Method with name \'' + methodName + '\' has already been registered.');
        }
        var transactionalMethodName = 't' + methodName[0].toUpperCase() + methodName.slice(1,methodName.length);
        module[transactionalMethodName] = handler;
        module[methodName] = Ravel.db.createTransactionEntryPoint(module[transactionalMethodName]);
      }
    };

    //save uninitialized module to Ravel.modules
    //so that it can be injected into other 
    //modules and lazily instantiated
    Ravel.modules[name] = module;

    //build module instantiation function
    moduleFactories[name] = function() {
      var moduleInject = require(path.join(__dirname, modulePath));
      injector.inject({
        '$L': require('./lib/log')(name),
        '$MethodBuilder': methodBuilder,
        '$KV': Ravel.kvstore
      },moduleInject);
    }
  };
  
  /**
   * Register a service with Ravel
   *
   * A service is a RESTful endpoint for a single Resource
   *
   * @param {String} basePath The base path of the all the Resource's endpoints
   * @param {String} servicePath the path of the service module to require(...)
   *
   */
  Ravel.service = function(basePath, servicePath) {
    //if a service with this name has already been regsitered, error out
    if (serviceFactories[basePath]) {
      throw new ApplicationError.DuplicateEntryError('Service with name \'' + basePath + '\' has already been registered.');
    }
    var endpointBuilder = {
      _methods: {}
    };
    var addMethod = function(method) {
      endpointBuilder[method] = function() {
        //first argument is whether or not the endpoint requires authentication
        var secure = arguments[0];
        //all other arguments are express middleware of the form function(req, res, next?)
        var middleware = Array.prototype.slice.call(arguments, 1);
        if (endpointBuilder._methods[method]) {
          throw new ApplicationError.DuplicateEntryError('Method '+method+' has already been registered with service \''+basePath+'\'');
        }
        endpointBuilder._methods[method] = {
          secure: secure,
          middleware: middleware
        };
        return endpointBuilder;
      }
    };    
    addMethod('getAll');
    addMethod('postAll');
    addMethod('putAll');
    addMethod('deleteAll');    
    addMethod('get');
    addMethod('post');
    addMethod('put');
    addMethod('delete');

    //build service instantiation function
    serviceFactories[basePath] = function(expressApp) {
      var serviceInject = require(path.join(__dirname, servicePath));
      injector.inject({
        '$L': require('./lib/log')(basePath), 
        '$EndpointBuilder': endpointBuilder,
        '$Rest': rest,
        '$KV': Ravel.kvstore,
        '$Broadcast': Ravel.broadcast
      }, serviceInject);
      //process all methods and add to express app
      var buildRoute = function(methodType, methodName) {
        var bp = basePath;
        if (methodName === 'get' || methodName === 'post' || methodName === 'put' || methodName === 'delete') {
          bp = path.join(basePath, '/:id');
        }
        var args = [bp];
        if (endpointBuilder._methods[methodName]) {
          if (endpointBuilder._methods[methodName].secure) {
            l.i('Registering secure service endpoint ' + methodType.toUpperCase() + ' ' + bp);
            args.push(Ravel.authorize);
          } else {
            l.i('Registering public service endpoint ' + methodType.toUpperCase() + ' ' + bp);
          }
          args = args.concat(endpointBuilder._methods[methodName].middleware);
          expressApp[methodType].apply(expressApp, args);
        } else {
          //l.i('Registering unimplemented service endpoint ' + methodType.toUpperCase() + ' ' + bp);
          expressApp[methodType](bp, function(req, res) {
            res.status(rest.NOT_IMPLEMENTED).end();
          });
        }
      };
      buildRoute('get', 'getAll');
      buildRoute('post', 'postAll');
      buildRoute('put', 'putAll');
      buildRoute('delete', 'deleteAll');
      buildRoute('get', 'get');
      buildRoute('post', 'post');
      buildRoute('put', 'put');
      buildRoute('delete', 'delete');
    }
  };

  /**
   * Registers a websocket room, with a given authorization function and context
   *
   * @param {String} roomPattern the name of the websocket room
   * @param {Function} authorizationFunction, of the form function(userId, callback(err, {Boolean}authorized))
   */
  Ravel.room = function(roomPattern, authorizationFunction) {
    //if a service with this name has already been regsitered, error out
    if (rooms[roomPattern]) {
      throw new ApplicationError.DuplicateEntryError('Websocket room with path \'' + roomPattern + '\' has already been registered.');
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
    app.set('views', path.join(__dirname, Ravel.get('express view directory')));
    app.set('view engine', Ravel.get('express view engine'));
    //app.use(require('morgan')('dev')); //uncomment to see HTTP requests
    app.use(compression());
    if (Ravel.get('express favicon path')) {
      app.use(favicon(__dirname + Ravel.get('express favicon path')));
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
    app.use(express.static(path.join(__dirname, Ravel.get('express public directory'))));
    app.use(require('connect-flash')());
    
    //initialize passport authentication      
    app.use(passport.initialize());
    app.use(passport.session());  
    require('./lib/passport_init.js')(Ravel, passport);
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

    //create registered services using factories
    for (var serviceName in serviceFactories) {
      serviceFactories[serviceName](app);
    }

    //Start ExpressJS server
    server.listen(Ravel.get('node port'), function(){
      l.i("Application server at " + Ravel.get('node domain') + " listening on port " + Ravel.get('node port'));
    });
  };
  
  //Register known ravel parameters
  //redis parameters
  Ravel.registerSimpleParameter('redis host', true);
  Ravel.registerSimpleParameter('redis port', true);
  Ravel.registerSimpleParameter('redis password');
  Ravel.registerSimpleParameter('websocket message cache time');
  //mysql parameters
  Ravel.registerSimpleParameter('mysql host', true);
  Ravel.registerSimpleParameter('mysql port', true);
  Ravel.registerSimpleParameter('mysql user', true);
  Ravel.registerSimpleParameter('mysql password', true);
  Ravel.registerSimpleParameter('mysql database name', true);
  Ravel.registerSimpleParameter('mysql connection pool size', true);
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
  Ravel.registerSimpleParameter('get user function', true);
  Ravel.registerSimpleParameter('get or create user function', true);
  
  return Ravel;
};
