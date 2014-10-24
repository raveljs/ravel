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
   * Module should use injection to get what it needs
   *
   * @param {String} name The name of the module
   * @param {String} modulePath The path to the module   
   * 
   */
  Ravel.module = function(name, modulePath) {
  //if a module with this name has already been regsitered, error out
  if (moduleFactories[name]) {
    throw new Ravel.ApplicationError.DuplicateEntry('Module with name \'' + name + '\' has already been registered.');
  }

  var module = {};
  var methodBuilder = {      
    add: function(methodName, handler) {
      if (module[methodName]) {
        throw new Ravel.ApplicationError.DuplicateEntry('Method with name \'' + methodName + '\' has already been registered.');
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
    var moduleInject = require(path.join(Ravel.cwd, modulePath));
    injector.inject({
      '$L': require('../util/log')(name),
      '$MethodBuilder': methodBuilder,
      '$KV': Ravel.kvstore
    },moduleInject);
  };
};
};