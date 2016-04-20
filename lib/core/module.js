'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');

const sInit = Symbol.for('_init');

/**
 * Provides Ravel with a simple mechanism of registering
 * user-defined modules and connecting them, via
 * injector.js, with dependency injection
 */
class Module {}
Module.prototype[sInit] = function(ravelInstance, name) {
  this.name = name;
  this.ApplicationError = ravelInstance.ApplicationError;
  this.log = ravelInstance.Log.getLogger(name);
  this.kvstore = ravelInstance.kvstore;
  this.params = {
    get: ravelInstance.get
  };
};

/** add in @authconfig decorator as static property */
require('../auth/authconfig')(Module);

/**
 * Populate Ravel class with static reference to the Module class
 */
module.exports = function(Ravel) {

  Ravel.Module = Module;

  /**
   * Ravel.module()
   * Register a module with Ravel
   *
   * A module is a pure node.js javascript class consisting of functions with no
   * network-related functionality, suitable for unit-testing.
   *
   * Modules should use injection to refer to other Ravel modules and NPM
   * dependencies.
   *
   * @param {String} modulePath The path to the module
   * @param {String} name the name for the module, which will be used for dependency injection
   */
  Ravel.prototype.module = function(modulePath, name) {
    if (name === undefined) {
      // if no name is supplied, error out
      throw new this.ApplicationError.IllegalValue(`Name required for module at ${modulePath}`);
    } else if (this[symbols.moduleFactories][name]) {
      // if a module with this name has already been regsitered, error out
      throw new this.ApplicationError.DuplicateEntry(
        `Module with name '${name}' has already been registered.`);
    }

    const moduleClass = require(upath.join(this.cwd, modulePath));
    if (moduleClass.prototype instanceof Module) {
      // store path to module file in metadata
      Metadata.putClassMeta(moduleClass.prototype, 'source', 'path', modulePath);
      // store known module with path as the key, so someone can reflect on the class
      this[symbols.registerClassFunc](modulePath, moduleClass);
      // build injection function
      this[symbols.moduleFactories][name] = () => {
        // perform DI on module factory
        const temp = this[symbols.injector].inject({},moduleClass);
        temp[sInit](this, name);
        // overwrite uninitialized module with the correct one
        this[symbols.modules][name] = temp;
        return temp;
      };
      this[symbols.moduleFactories][name].moduleName = name;
      this[symbols.moduleFactories][name].dependencies = this[symbols.injector].getDependencies(moduleClass);
      this[symbols.moduleFactories][name].parents = [];
      this[symbols.moduleFactories][name].children = [];
    } else {
      throw new this.ApplicationError.IllegalValue(
        `Module with path ${modulePath} must be a subclass of Ravel.Module`);
    }


    // save uninitialized module to Ravel.modules
    // temporarily, until it is replaced by an
    // instantiated version in _moduleInit
    this[symbols.modules][name] = Object.create(null);
  };

  /**
   * Private module init
   *
   * Performs module initialization, detecting dependency cycles
   * and executing module factories in dependency order in
   * Ravel.init()
   */
  Ravel.prototype[symbols.moduleInit] = function() {
    const rootFactories = Object.create(null);

    // build dependency graph
    for (let moduleName of Object.keys(this[symbols.moduleFactories])) {
      const dependencies = this[symbols.moduleFactories][moduleName].dependencies;
      const factoryDeps = [];
      for (let d=0;d<dependencies.length;d++) {
        if (this[symbols.moduleFactories][dependencies[d]] !== undefined) {
          // build two-way edge
          factoryDeps.push(this[symbols.moduleFactories][dependencies[d]]);
          this[symbols.moduleFactories][dependencies[d]].children.push(this[symbols.moduleFactories][moduleName]);
        }
      }
      this[symbols.moduleFactories][moduleName].parents = factoryDeps;

      // If this module has no dependencies on other client module factories,
      // then it is a root node.
      if (this[symbols.moduleFactories][moduleName].parents.length === 0) {
        this[symbols.moduleFactories][moduleName].maxDepth = 0;
        rootFactories[moduleName] = this[symbols.moduleFactories][moduleName];
      }
    }

    // calculate max depth of each factory, then sort by it. detect cyclical dependencies.
    const instantiationOrder = [];
    const visitedMeta = new WeakMap();
    const calcDepth = (moduleFactory, visitedTag, startModule, last) => {
      if (!visitedTag) {
        visitedTag = Math.random();
      }
      if (!startModule) {
        startModule = moduleFactory.moduleName;
      }
      if (visitedMeta.get(moduleFactory) === visitedTag) {
        throw new this.ApplicationError.General(
          `Module instantiation failed. A cyclical dependency exists between modules \' ${startModule} and ${last}`);
      } else if (moduleFactory.maxDepth === undefined) {
        visitedMeta.set(moduleFactory, visitedTag);
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
    for (let moduleName of Object.keys(this[symbols.moduleFactories])) {
      const depth = calcDepth(this[symbols.moduleFactories][moduleName]);
      if (!instantiationOrder[depth]) {
        instantiationOrder[depth] = [];
      }
      instantiationOrder[depth].push(this[symbols.moduleFactories][moduleName]);
    }

    // instantiate in depth order
    for (let currDepth=0;currDepth<instantiationOrder.length;currDepth++) {
      for (let m=0;m<instantiationOrder[currDepth].length;m++) {
        instantiationOrder[currDepth][m]();
      }
    }
  };
};

// mix class into exports so other classes can subclass it
module.exports.Module = Module;
