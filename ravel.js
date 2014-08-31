var ApplicationError = require('./application_error');
var l = require('lib/log')('ravel');
var rest = require('lib/simple_rest');

module.exports = function() {  
  var Ravel = {
    _params: {},
    _serviceFactories: {}
  };
  
  var knownParameters = {};
  
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
    if (Ravel._params[key]) {
      if (knownParameters[key].required && !Ravel._params[key].value) {
        throw new ApplicationError.NotFound('Parameter \'' + name + '\' is required.');
      } else if (!Ravel._params[key].value) {
        l.w('Parameter \'' + key + '\' is not defined.');
        return undefined;
      } else {
        return Ravel._params[key].value;
      }
    } else {
      l.w('Parameter \'' + key + '\' is not defined.');
      return undefined;
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
      Ravel._params[key] = value;
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
   * @param {String} path The path to the module   
   * 
   */
  Ravel.module = function(name, path) {
    //if a module with this name has already been regsitered, error out
    if (Ravel.modules[name]) {
      throw new ApplicationError.DuplicateEntryError('Module with name \'' + name + '\' has already been registered.');
    }
    Ravel.modules[name] = require(path)(Ravel, require('lib/log')(name));
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
    if (Ravel._serviceFactories[serviceName]) {
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
      Ravel._serviceFactories[serviceName] = {
        basePath: basePath,
        factory: function(expressApp, authorize) {
          //callback takes id for the non-All ones
          //process all methods and add to express app

          var buildRoute = function(methodType, methodName) {
            //TODO integrate simple rest, give middleware a callback
            if (serviceBuilder._methods[methodName]) {
              if (serviceBuilder._methods[methodName].secure) {
                expressApp[methodType](basePath, authorize, serviceBuilder._methods[methodName].middleware);
              } else {
                expressApp[methodType](basePath, serviceBuilder._methods[methodName].middleware);
              }
            } else if (){
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
    var cluster = require('cluster');
  
    Ravel.kvstore = require('lib/kvstore')('ravel_prefix', Ravel);
    //Cluster application. 
    //- Master forks N workers where N is the number of CPUs on the machine.
    //- Workers are automatically replaced if they die.
    //- Sessions are shared between worker nodes via Express's redis session store
    //- Broadcasting to all connected clients across all worker nodes is handled
    //  by lib/broadcast.js which leverages Redis pub/sub for inter-worker 
    //  communication. Each worker is responsible for broadcasting to their own
    //  connected clients.
    if (cluster.isMaster) {
    ////BEGIN CLUSTER MASTER
      var masterLog = function(msg) {
        l.l("[MASTER] " + msg);
      };

      //empty key-value cache
      //kvstore.flushdb();

      // Create a worker for each CPU. allow override via process.env.CLUSTER_SIZE
      var cpuCount = process.env.CLUSTER_SIZE ? process.env.CLUSTER_SIZE : require('os').cpus().length;
      masterLog("Starting application cluster with " + cpuCount + " Workers...");
      for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
      }
      
      // Listen for dying workers
      cluster.on('exit', function (worker) {
        // Replace the dead worker
        masterLog('Worker id=' + worker.id + ' died. Creating replacement Worker.');
        cluster.fork();
      });
    ////END CLUSTER MASTER
    } else {
    ////BEGIN CLUSTER WORKER NODE
      var workerLog = function(msg) {
        l.l("[WORKER "+cluster.worker.id+"] " + msg);
      };

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
      app.set('app domain', Ravel.get('node domain'));
      app.set('app port', Ravel.get('node port'));
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
      app.use(express.static(path.join(__dirname, 'public')));
      app.use(require('connect-flash')());
      
      //initialize passport authentication      
      app.use(passport.initialize());
      app.use(passport.session());  
      require('./lib/passport_init.js')(app, lib, passport);
      var authorize = require('./lib/authorize_request')(lib, kvstore, '/login', false);
      var authorizeAllowMobileRegistrationOrUpdate = require('./lib/authorize_request')(lib, kvstore, '/login', true);
      
      //create registered services using factories
      for (var serviceName in Ravel._serviceFactories) {
        Ravel._serviceFactories[serviceName](app);
      }
    ////END CLUSTER WORKER NODE
    }
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
  Ravel.registerSimpleParameter('node domain', true);
  Ravel.registerSimpleParameter('node port', true);
  Ravel.registerSimpleParameter('express view directory', true);
  Ravel.registerSimpleParameter('express view engine', true);
  Ravel.registerSimpleParameter('express favicon path');
  Ravel.registerSimpleParameter('express session secret', true);
  //Google OAuth parameters
  Ravel.registerSimpleParameter('google oauth2 web client id', true);
  Ravel.registerSimpleParameter('google oauth2 android client id');
  Ravel.registerSimpleParameter('google oauth2 ios client id');
  //Passport parameters
  Ravel.registerSimpleParameter('get user function', true);
  Ravel.registerSimpleParameter('get or create user function', true);
  
  return Ravel;
};;
