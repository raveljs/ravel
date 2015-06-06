'use strict';

/**
 * Provides Ravel with a simple mechanism of registering
 * user-defined modules and connecting them, via
 * injector.js, with dependency injection
 */

var path = require('path');
var util = require('util');

module.exports = function(Ravel, moduleFactories, injector) {
  /**
   * Register a module with Ravel
   *
   * A module is a pure node.js javascript API consisting of functions with no
   * network-related functionality, suitable for unit-testing.
   *
   * Modules should use injection to refer to other Ravel modules and NPM
   * dependencies.
   *
   * @param {String} modulePath The path to the module
   *
   */
  Ravel.module = function(modulePath) {
    var name = path.basename(modulePath, path.extname(modulePath));
    name = name.replace(/-([A-Za-z])/g, function (g) { return g[1].toUpperCase(); });

    //if a module with this name has already been regsitered, error out
    if (moduleFactories[name]) {
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Module with name \'' + name + '\' has already been registered.');
    }

    var injectableModule;

    var moduleInject = require(path.join(Ravel.cwd, modulePath));

    if (typeof(moduleInject) === 'object' && !util.isArray(moduleInject)) {
      //this is not a module factory, so no need to perform dependency injection
      injectableModule = moduleInject;
    } else if (typeof(moduleInject) === 'function' || util.isArray(moduleInject)) {
      injectableModule = {};
      moduleFactories[name] = function() {
        //perform DI on module factory
        var temp = injector.inject({
          '$L': Ravel.Log.getLogger(name),
          '$KV': Ravel.kvstore
        },moduleInject);
        //copy completed module methods into stub uninitialized module
        for (var method in temp) {
          injectableModule[method] = temp[method];
        }
      };
    } else {
      throw new Ravel.ApplicationError.IllegalValue('Module with path ' +
        modulePath + ' must be a factory function or an object.');
    }


    //save potentially uninitialized module
    //to Ravel.modules so that it can be
    //injected into other modules and
    //lazily instantiated
    Ravel.modules[name] = injectableModule;
  };
};
