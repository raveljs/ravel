'use strict';

/**
 * Dependency injection, inspired by AngularJS
 */
var prototype = require('prototype');
var util = require('util');

/**
 * @param {Object} Ravel a reference to the current Ravel
 * @param {Array} moduleFactories a list of registered module factories
 *                                which haven't yet been instantiated
 * @param {Object} requireModule the module to run require()s relative to,
 *                               if a client tries to inject an NPM dependency
 */
module.exports = function(Ravel, moduleFactories, requireModule) {
  var Injector = {};

  Injector.getDependencies = function(injectionFunction) {
    var requestedModules;
    if (util.isArray(injectionFunction)) {
      requestedModules = injectionFunction.slice(0,injectionFunction.length-1);
    } else {
      Object.extend(injectionFunction, prototype);
      requestedModules = injectionFunction.argumentNames();
    }
    return requestedModules;
  };

  Injector.inject = function(moduleMap, injectionFunction) {
    moduleMap['$E'] = Ravel.ApplicationError;

    var requestedModules = Injector.getDependencies(injectionFunction);
    if (util.isArray(injectionFunction)) {
      injectionFunction = injectionFunction[injectionFunction.length-1];
    }

    var args = [];
    for (var i=0;i<requestedModules.length;i++) {
      if (moduleMap[requestedModules[i]] !== undefined) {
        //if the requested module is in our map of predefined valid stuff
        args.push(moduleMap[requestedModules[i]]);
      } else if (moduleFactories[requestedModules[i]] !== undefined) {
        //if the requested module is a registered module
        args.push(Ravel.modules[requestedModules[i]]);
      } else {
        try {
          var requiredModule = requireModule.require(requestedModules[i]);
          args.push(requiredModule);
        } catch (e) {
          throw new Ravel.ApplicationError.NotFound('Unable to inject ' +
            'requested module \'' + requestedModules[i] + '\'. If it is ' +
            'one of your modules, make sure you register it with ' +
            'Ravel.module before running Ravel.start. If it is an NPM ' +
            'dependency, make sure it is in your package.json and that it ' +
            'has been installed via $ npm install.');
        }
      }
    }
    return injectionFunction.apply(injectionFunction, args);
  };

  return Injector;
};
