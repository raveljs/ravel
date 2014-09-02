var path = require('path');
var ApplicationError = require('./lib/application_error');
var l = require('./lib/log')('ravel');
var rest = require('./lib/simple_rest');

module.exports = function() {  
  var Ravel = {
    modules: {}
  };
  
  var moduleFactories = {};
  var serviceFactories = {};
  var knownParameters = {};
  var params = {};
  
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
      l.w('Optional parameter \'' + key + '\' was requested, but is not defined.');
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
   * Module should use an injection format which matches the following:
   *
   * module.exports = function(Ravel, l) {
   *   ...
   * }
   *
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
    moduleFactories[name] = function() {
      Ravel.modules[name] = require(path.join(__dirname, modulePath))(Ravel, require('./lib/log')(name));
      Ravel.db.createTransactionEntryPoints(Ravel.modules[name]);
    }
  };
  
  /**
   * Register a service with Ravel
   *
   * A service is a RESTful endpoint for a single Resource
   *
   * @param {String} serviceName The name of the Service
   * @param {String} basePath The base path of the Resource
   * @return {Object} builder a builder for the service, with the
   *                          following methods:
   *
   *
   */
  Ravel.service = function(serviceName, basePath) {
    //if a service with this name has already been regsitered, error out
    if (serviceFactories[serviceName]) {
      throw new ApplicationError.DuplicateEntryError('Service with name \'' + name + '\' has already been registered.');
    }
    var serviceBuilder = {
      _methods: {}
    };
    var addMethod = function(method) {
      serviceBuilder[method] = function(secure, middleware) {
        if (serviceBuilder._methods[method]) {
          throw new ApplicationError.DuplicateEntryError('Method '+method+' has already been registered with service \''+serviceName+'\'');
        }
        serviceBuilder._methods[method] = {
          secure: secure,
          middleware: middleware
        };
        return serviceBuilder;
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
    serviceBuilder.done = function() {
      //TODO does done need to exist at all?
      serviceFactories[serviceName] = {
        basePath: basePath,
        factory: function(expressApp, authorize) {
          //callback takes id for the non-All ones
          //process all methods and add to express app

          var buildRoute = function(methodType, methodName) {
            //TODO integrate simple rest, give middleware a callback
            if (serviceBuilder._methods[methodName]) {
              if (serviceBuilder._methods[methodName].secure) {
                expressApp[methodType](basePath, Ravel.authorize, serviceBuilder._methods[methodName].middleware);
              } else {
                expressApp[methodType](basePath, serviceBuilder._methods[methodName].middleware);
              }
            } else {
              expressApp[methodType](basePath, function(req, res) {
                res.send(rest.NOT_IMPLEMENTED);
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
    };
    return serviceBuilder;
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
    
    //create registered modules using factories
    for (var moduleName in moduleFactories) {
      moduleFactories[moduleName]();
    }
    
    //create registered services using factories
    for (var serviceName in serviceFactories) {
      serviceFactories[serviceName](app);
    }
    
    //Create ExpressJS server
    var server = http.createServer(app);

    //Pass server to Primus to get it going on the same port
    //Initialize primus.io with room handling, etc.
    var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });
    //TODO primus_init produces a configured, cluster-ready broadcasting library
    //var broadcast = require('./lib/primus_init.js')(app, lib, express, expressSessionStore, primus, db, kvstore);
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
  //Google OAuth parameters
  Ravel.registerSimpleParameter('google oauth2 web client id', true);
  Ravel.registerSimpleParameter('google oauth2 web client secret', true);
  Ravel.registerSimpleParameter('google oauth2 android client id');
  Ravel.registerSimpleParameter('google oauth2 ios client id');
  Ravel.registerSimpleParameter('google oauth2 ios client secret');
  //Passport parameters
  Ravel.registerSimpleParameter('get user function', true);
  Ravel.registerSimpleParameter('get or create user function', true);
  Ravel.registerSimpleParameter('web authentication failure redirect path');
  
  return Ravel;
};
