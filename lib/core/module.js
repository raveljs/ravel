'use strict';

/**
 * Provides Ravel with a simple mechanism of registering
 * user-defined modules and connecting them, via
 * injector.js, with dependency injection
 */

const upath = require('upath');

class Module {
  _init(Ravel, name) {
    this.name = name;
    this.log = Ravel.Log.getLogger(name);
  }
}

module.exports = function(Ravel) {

  // Make Module class available statically for extension
  Ravel.Module = Module;

  /**
   * Register a module with Ravel
   *
   * A module is a pure node.js javascript class consisting of functions with no
   * network-related functionality, suitable for unit-testing.
   *
   * Modules should use injection to refer to other Ravel modules and NPM
   * dependencies.
   *
   * @param {String} modulePath The path to the module
   *
   */
  Ravel.prototype.module = function(modulePath) {
    let name = upath.basename(modulePath, upath.extname(modulePath));
    name = name.replace(/-([A-Za-z])/g, function (g) { return g[1].toUpperCase(); });

    //if a module with this name has already been regsitered, error out
    if (this._moduleFactories[name]) {
      throw new this.ApplicationError.DuplicateEntry(
        'Module with name \'' + name + '\' has already been registered.');
    }

    const moduleInject = require(upath.join(this.cwd, modulePath));
    if (moduleInject.prototype instanceof Module) {
      //build injection function
      this._moduleFactories[name] = () => {
        //perform DI on module factory
        const temp = this._injector.inject({
          '$KV': this.kvstore,
          '$Params': {
            set: this.set,
            get: this.get,
            registerSimpleParameter: this.registerSimpleParameter
          }
        },moduleInject);
        temp._init(this, name);
        //overwrite uninitialized module with the correct one
        this._modules[name] = temp;
        return temp;
      };
      this._moduleFactories[name].moduleName = name;
      this._moduleFactories[name].dependencies = this._injector.getDependencies(moduleInject);
      this._moduleFactories[name].parents = [];
      this._moduleFactories[name].children = [];
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Module with path ${modulePath} must be a subclass of Ravel.Module`);
    }


    //save uninitialized module to Ravel.modules
    //temporarily, until it is replaced by an
    //instantiated version in _moduleInit
    this._modules[name] = Object.create(null);
  };

  /**
   * Performs module initialization, detecting dependency cycles
   * and executing module factories in dependency order in
   * Ravel.init()
   */
  Ravel.prototype._moduleInit = function() {
    const rootFactories = Object.create(null);

    //build dependency graph
    for (let moduleName of Object.keys(this._moduleFactories)) {
      const dependencies = this._moduleFactories[moduleName].dependencies;
      const factoryDeps = [];
      for (let d=0;d<dependencies.length;d++) {
        if (this._moduleFactories[dependencies[d]] !== undefined) {
          //build two-way edge
          factoryDeps.push(this._moduleFactories[dependencies[d]]);
          this._moduleFactories[dependencies[d]].children.push(this._moduleFactories[moduleName]);
        }
      }
      this._moduleFactories[moduleName].parents = factoryDeps;

      //If this module has no dependencies on other client module factories,
      //then it is a root node.
      if (this._moduleFactories[moduleName].parents.length === 0) {
        this._moduleFactories[moduleName].maxDepth = 0;
        rootFactories[moduleName] = this._moduleFactories[moduleName];
      }
    }

    //calculate max depth of each factory, then sort by it. detect cyclical dependencies.
    const instantiationOrder = [];
    const calcDepth = (moduleFactory, visitedTag, startModule, last) => {
      if (!visitedTag) {
        visitedTag = Math.random();
      }
      if (!startModule) {
        startModule = moduleFactory.moduleName;
      }
      if (moduleFactory._visited === visitedTag) {
        throw new this.ApplicationError.General(
          'Module instantiation failed. A cyclical dependency exists between modules \'' +
          startModule + '\' and \'' + last + '\'');
      } else if (moduleFactory.maxDepth === undefined) {
        moduleFactory._visited = visitedTag;
        let maxDepth = -1;
        for (let p of moduleFactory.parents) {
          // if (!moduleFactory.parents.hasOwnProperty(p)) {continue;}
          let pDepth = p.maxDepth !== undefined ?
            p.maxDepth :
            calcDepth(p, visitedTag, startModule, moduleFactory.moduleName);
          maxDepth = Math.max(maxDepth, pDepth);
        }
        moduleFactory.maxDepth = maxDepth+1;
      }
      return moduleFactory.maxDepth;
    };
    for (let moduleName of Object.keys(this._moduleFactories)) {
      const depth = calcDepth(this._moduleFactories[moduleName]);
      if (!instantiationOrder[depth]) {
        instantiationOrder[depth] = [];
      }
      instantiationOrder[depth].push(this._moduleFactories[moduleName]);
    }

    //instantiate in depth order
    for (let currDepth=0;currDepth<instantiationOrder.length;currDepth++) {
      for (let m=0;m<instantiationOrder[currDepth].length;m++) {
        instantiationOrder[currDepth][m]();
      }
    }
  };
};
