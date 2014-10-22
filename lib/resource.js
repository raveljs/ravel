'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Provides Ravel with a mechanism to register a RESTful
 * resource, and gives the client the ability to define
 * up to 7 methods on that resource endpoint (GET, POST, 
 * PUT, DELETE, GET all, PUT all, DELETE all).
 *
 * Also supports, via broadcast_middleware.js, the 
 * publishing of messages to clients in specific
 * websocket rooms (based on the path of the resource)
 * concerning events which have occurred at this endpoint
 * (such as the creation of a new record or the alteration
 * of an existing one).
 */

var path = require('path');  


module.exports = function(Ravel, resourceFactories, injector) {
  var rest = require('./rest')(Ravel);
  var broadcastMiddleware = require('./broadcast_middleware')(Ravel);

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
      throw new Ravel.ApplicationError.DuplicateEntry('Resource with name \'' + basePath + '\' has already been registered.');
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
          throw new Ravel.ApplicationError.DuplicateEntry('Method '+method+' has already been registered with resource \''+basePath+'\'');
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
      var resourceInject = require(path.join(Ravel.cwd, resourcePath));
      injector.inject({
        '$L': require('./log')(basePath), 
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
          args.push(broadcastMiddleware);
          if (endpointBuilder._methods[methodName].secure) {
            Ravel.Log.i('Registering secure resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
            args.push(Ravel.authorize);
          } else {
            Ravel.Log.i('Registering public resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
          }
          args = args.concat(endpointBuilder._methods[methodName].middleware);
          expressApp[methodType].apply(expressApp, args);
        } else {
          //Ravel.Log.i('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
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
};