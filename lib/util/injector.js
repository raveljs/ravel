'use strict';

/**
 * Dependency injection for Ravel modules
 */
const util = require('util');

class Injector {
  /**
   * @param {Object} ravelInstance a reference to the current Ravel instance
   * @param {Object} requireModule the module to run require()s relative to,
   *                               if a client tries to inject an NPM dependency
   */
  constructor(ravelInstance, requireModule) {
    this._ravelInstance = ravelInstance;
    this._requireModule = requireModule;
  }

  getDependencies(DIClass) {
    if (DIClass.inject !== undefined && !util.isArray(DIClass.inject)) {
      throw new this._ravelInstance.ApplicationError.IllegalValue(
        `Unable to perform dependency injection on ${typeof DICLass}.
          Static inject property is supplied but is not an array.`);
    } else if (DIClass.inject === undefined){
      return [];
    } else {
      return DIClass.inject;
    }
  }

  getModule(moduleMap, moduleName) {
    if (moduleMap[moduleName] !== undefined) {
      //if the requested module is in our map of predefined valid stuff
      return moduleMap[moduleName];
    } else if (this._ravelInstance._moduleFactories[moduleName] !== undefined) {
      //if the requested module is a registered module
      return this._ravelInstance._modules[moduleName];
    } else {
      try {
        let requiredModule = this._requireModule.require(moduleName);
        return requiredModule;
      } catch (e) {
        throw new this._ravelInstance.ApplicationError.NotFound('Unable to inject ' +
          'requested module \'' + moduleName + '\'. If it is ' +
          'one of your modules, make sure you register it with ' +
          'Ravel.module before running Ravel.start. If it is an NPM ' +
          'dependency, make sure it is in your package.json and that it ' +
          'has been installed via $ npm install.');
      }
    }
  }

  inject(moduleMap, DIClass) {
    moduleMap.$E = this._ravelInstance.ApplicationError;

    let requestedModules = this.getDependencies(DIClass);

    let args = [];
    for (let i=0;i<requestedModules.length;i++) {
      args.push(this.getModule(moduleMap, requestedModules[i]));
    }
    return new DIClass(...args);
  }
}


module.exports = Injector;
