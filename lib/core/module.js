'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Provides Ravel with a simple mechanism of registering
 * user-defined modules and connecting them, via
 * injector.js, with dependency injection
 */

var path = require('path');

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
   * @param {String} name The name of the module
   * @param {String} modulePath The path to the module
   *
   */
  Ravel.module = function(name, modulePath) {
    //if a module with this name has already been regsitered, error out
    if (moduleFactories[name]) {
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Module with name \'' + name + '\' has already been registered.');
    }

    var module = {};

    //save uninitialized module to Ravel.modules
    //so that it can be injected into other
    //modules and lazily instantiated
    Ravel.modules[name] = module;

    //build module instantiation function
    moduleFactories[name] = function() {
      var moduleInject = require(path.join(Ravel.cwd, modulePath));
      if (typeof(moduleInject) === 'function') {
        //perform DI on module factory
        var temp = injector.inject({
          '$L': require('../util/log')(name),
          '$KV': Ravel.kvstore
        },moduleInject);
        //copy completed module methods into stub uninitialized module
        for (var method in temp) {
          module[method] = temp[method];
        }
      } else if (typeof(moduleInject) === 'object') {
        //this is not a module factory, so we'll just copy
        //module methods into stub uninitialized module
        for (var existingMethod in moduleInject) {
          module[existingMethod] = moduleInject[existingMethod];
        }
      } else {
        throw new Ravel.ApplicationError.IllegalValue('Module with path ' +
          modulePath + ' must be a factory function or an object.');
      }
    };
  };
};
