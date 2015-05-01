'use strict';

/**
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
var httpCodes = require('../util/http_codes');

module.exports = function(Ravel, resourceFactories, injector) {
  var rest = require('../util/rest')(Ravel);
  var broadcastMiddleware = require('../ws/util/broadcast_middleware')(Ravel);

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
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Resource with name \'' + basePath + '\' has already been registered.');
    }
    //Build EndpointBuilder service, which will facilitate public
    //endpoints like $EndpointBuilder.getAll(...), or private ones
    //via $EndpointBuilder.getAll($Private, ...)
    var endpointBuilder = {
      _methods: {}
    };
    var addMethod = function(obj, method) {
      obj[method] = function() {
        //all arguments are express middleware of the form function(req, res, next?)
        var middleware = Array.prototype.slice.call(arguments, 0);
        if (endpointBuilder._methods[method]) {
          throw new Ravel.ApplicationError.DuplicateEntry(
            'Method '+method+' has already been registered with resource \''+basePath+'\'');
        } else {
          endpointBuilder._methods[method] = {
            middleware: middleware
          };
          return endpointBuilder;
        }
      };
    };
    addMethod(endpointBuilder, 'getAll');
    addMethod(endpointBuilder, 'putAll');
    addMethod(endpointBuilder, 'deleteAll');
    addMethod(endpointBuilder, 'get');
    addMethod(endpointBuilder, 'post');
    addMethod(endpointBuilder, 'put');
    addMethod(endpointBuilder, 'delete');

    //build resource instantiation function
    resourceFactories[basePath] = function(expressApp) {
      var resourceInject = require(path.join(Ravel.cwd, resourcePath));
      injector.inject({
        '$L': Ravel.Log.getLogger(basePath),
        '$EndpointBuilder': endpointBuilder,
        '$Rest': rest,
        '$KV': Ravel.kvstore,
        '$Broadcast': Ravel.broadcast,
        '$MiddlewareTransaction': Ravel.db.middleware,
        '$Private': Ravel.authorize,
        '$PrivateRedirect': Ravel.authorizeWithRedirect
      }, resourceInject);
      //process all methods and add to express app
      var buildRoute = function(methodType, methodName) {
        var bp = basePath;
        if (methodName === 'get' || methodName === 'put' || methodName === 'delete') {
          bp = path.join(basePath, '/:id');
        }
        var args = [bp];
        if (endpointBuilder._methods[methodName]) {
          Ravel.Log.info('Registering resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
          args.push(broadcastMiddleware);
          args = args.concat(endpointBuilder._methods[methodName].middleware);
          expressApp[methodType].apply(expressApp, args);
        } else {
          //Ravel.Log.info('Registering unimplemented resource endpoint ' + methodType.toUpperCase() + ' ' + bp);
          expressApp[methodType](bp, function(req, res) {
            res.status(httpCodes.NOT_IMPLEMENTED).end();
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
