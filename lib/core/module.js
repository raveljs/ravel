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
      //build injection function
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
      moduleFactories[name].name = name;
      moduleFactories[name].dependencies = injector.getDependencies(moduleInject);
      moduleFactories[name].parents = [];
      moduleFactories[name].children = [];
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

  /**
   * Performs module initialization, detecting dependency cycles
   * and executing module factories in dependency order.
   */
  Ravel.once('pre module init', function() {
    var rootFactories = Object.create(null);

    //build dependency graph
    for (var moduleName in moduleFactories) {
      var dependencies = moduleFactories[moduleName].dependencies;
      var factoryDeps = [];
      for (var d=0;d<dependencies.length;d++) {
        if (moduleFactories[dependencies[d]] !== undefined) {
          //build two-way edge
          factoryDeps.push(moduleFactories[dependencies[d]]);
          moduleFactories[dependencies[d]].children.push(moduleFactories[moduleName]);
        }
      }
      moduleFactories[moduleName].moduleName = moduleName;
      moduleFactories[moduleName].parents = factoryDeps;

      //If this module has no dependencies on other client module factories,
      //then it is a root node.
      if (moduleFactories[moduleName].parents.length === 0) {
        moduleFactories[moduleName].maxDepth = 0;
        rootFactories[moduleName] = moduleFactories[moduleName];
      }
    }

    //calculate max depth of each factory, then sort by it. detect cyclical dependencies.
    var instantiationOrder = [];
    var calcDepth = function(moduleFactory, visitedTag, startModule, last) {
      if (!visitedTag) {
        visitedTag = Math.random();
      }
      if (!startModule) {
        startModule = moduleFactory.moduleName;
      }
      if (moduleFactory._visited === visitedTag) {
        throw new Ravel.ApplicationError.General(
          'Module instantiation failed. A cyclical dependency exists between modules \'' +
          startModule + '\' and \'' + last + '\'');
      } else if (moduleFactory.maxDepth === undefined) {
        moduleFactory._visited = visitedTag;
        var maxDepth = -1;
        for (var p in moduleFactory.parents) {
          if (!moduleFactory.parents.hasOwnProperty(p)) {continue;}
          var pDepth = moduleFactory.parents[p].maxDepth !== undefined ?
            moduleFactory.parents[p].maxDepth :
            calcDepth(moduleFactory.parents[p], visitedTag, startModule, moduleFactory.moduleName);
          maxDepth = Math.max(maxDepth, pDepth);
        }
        moduleFactory.maxDepth = maxDepth+1;
      }
      return moduleFactory.maxDepth;
    };
    for (moduleName in moduleFactories) {
      var depth = calcDepth(moduleFactories[moduleName]);
      if (!instantiationOrder[depth]) {
        instantiationOrder[depth] = [];
      }
      instantiationOrder[depth].push(moduleFactories[moduleName]);
    }

    //instantiate in depth order
    for (var currDepth=0;currDepth<instantiationOrder.length;currDepth++) {
      for (var m=0;m<instantiationOrder[currDepth].length;m++) {
        instantiationOrder[currDepth][m]();
      }
    }
  });
};
