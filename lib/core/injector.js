'use strict';

const coreSymbols = require('./symbols');
const Metadata = require('../util/meta');

const sRavelInstance = Symbol.for('_ravelInstance');
const sRequireModule = Symbol.for('_requireModule');

/**
 * Dependency injection for Ravel modules. Processes a class
 * decorated with @inject (see util/inject) and performs
 * actual dependency injection.
 * @private
 */
class Injector {
  /**
   * @param {Object} ravelInstance - A reference to the current `ravel instance`.
   * @param {Object} requireModule - The module to run require()s relative to,
   *                               if a client tries to inject an NPM dependency.
   * @private
   */
  constructor (ravelInstance, requireModule) {
    this[sRavelInstance] = ravelInstance;
    this[sRequireModule] = requireModule;
  }

  /**
   * @param {Class} DIClass - A class to retrieve injection metadata from.
   * @returns {Array<string>} The modules which have been marked as DI dependencies
   *   for the target class (`@inject`ed).
   * @private
   */
  getInjectedDependencies (DIClass) {
    return [].concat(
      Metadata.getClassMetaValue(DIClass.prototype, '@inject', 'dependencies', [])
    );
  }

  /**
   * @param {Class} DIClass - A class to retrieve injection metadata from.
   * @returns {Array<string>} The modules which have been marked as DI dependencies
   *   for the target class (`@autoinject`ed).
   * @private
   */
  getAutoinjectedDependencies (DIClass) {
    return Object.assign({}, Metadata.getClassMetaValue(DIClass.prototype, '@autoinject', 'dependencies', {}));
  }

  /**
   * @param {Class} DIClass - A class to retrieve injection metadata from.
   * @returns {Array<string>} The modules which have been marked as DI dependencies
   *   for the target class (either `@inject`ed or `@autoinject`ed).
   * @private
   */
  getDependencies (DIClass) {
    return this.getInjectedDependencies(DIClass).concat(this.getAutoinjectedDependencies(DIClass));
  }

  /**
   * Resolves a module name into an actual injectable module reference. Client modules
   * override npm dependencies of the same name.
   *
   * @param {Object} moduleMap - A list of override modules (name -> reference).
   * @param {string} moduleName - The name of the module to be injected.
   * @returns {Object} The requested module.
   * @private
   */
  getModule (moduleMap, moduleName) {
    if (moduleMap[moduleName] !== undefined) {
      // if the requested module is in our map of predefined valid stuff
      return moduleMap[moduleName];
    } else if (this[sRavelInstance][coreSymbols.moduleFactories][moduleName] !== undefined) {
      // if the requested module is a registered module
      return this[sRavelInstance][coreSymbols.modules][moduleName];
    } else if (this[sRavelInstance][coreSymbols.middleware][moduleName] !== undefined) {
      // if the requested module is a registered middleware function
      return this[sRavelInstance][coreSymbols.middleware][moduleName];
    } else {
      try {
        const requiredModule = this[sRequireModule].require(moduleName);
        return requiredModule;
      } catch (e) {
        if (e.message.indexOf('Cannot find module') >= 0) {
          throw new this[sRavelInstance].$err.NotFound('Unable to inject ' +
            'requested module \'' + moduleName + '\'. If it is ' +
            'one of your modules, make sure you register it with ' +
            'Ravel.module before running Ravel.start. If it is an NPM ' +
            'dependency, make sure it is in your package.json and that it ' +
            'has been installed via $ npm install.');
        } else {
          throw new this[sRavelInstance].$err.General(`Unable to inject ' +
            'requested module ${moduleName} due to error:\n${e.stack}`);
        }
      }
    }
  }

  /**
   * Performs the actual dependency injection on a class, returning a new instance of that class.
   *
   * @param {Object} moduleMap - A list of override modules (name -> reference).
   * @param {Class} DIClass - The class to instantiate and perform DI on.
   * @returns {Object} - The module instance.
   * @private
   */
  inject (moduleMap, DIClass) {
    // @inject and construct
    const requestedInjectionModules = this.getInjectedDependencies(DIClass);
    const args = [];
    for (const m of requestedInjectionModules) {
      args.push(this.getModule(moduleMap, m));
    }
    const instance = new DIClass(...args);
    // then do @autoinject
    const requestedAutoinjectionModules = this.getAutoinjectedDependencies(DIClass);
    for (const auto of Object.keys(requestedAutoinjectionModules)) {
      instance[requestedAutoinjectionModules[auto]] = this.getModule(moduleMap, auto);
    }
    return instance;
  }
}

/*!
 * Export Injector
 */
module.exports = Injector;
