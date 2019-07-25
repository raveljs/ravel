'use strict';

const symbols = require('./symbols');
const Metadata = require('../util/meta');
const lifecycle = require('./decorators/lifecycle');
const coreServices = require('./services');
const $err = require('../util/application_error');

/*!
 * Initializer function for modules `Module`.
 *
 * @private
 */
async function initModule (ravelInstance) {
  const self = this;
  const name = Metadata.getClassMetaValue(Object.getPrototypeOf(self), '@role', 'name');
  // run @postinject handlers
  const postInjects = Metadata.getClassMeta(Object.getPrototypeOf(self), '@postinject', Object.create(null));
  await Promise.all(Object.keys(postInjects).map(f => postInjects[f].call(self)));
  // connect any Ravel lifecycle handlers to the appropriate events
  function connectHandlers (decorator, event) {
    const handlers = Metadata.getClassMeta(Object.getPrototypeOf(self), decorator, Object.create(null));
    for (const f of Object.keys(handlers)) {
      ravelInstance.once(event, (...args) => {
        ravelInstance.$log.trace(`${name}: Invoking ${decorator} ${f}`);
        handlers[f].apply(self, args);
      });
    }
  }
  connectHandlers('@postinit', 'post init');
  connectHandlers('@prelisten', 'pre listen');
  connectHandlers('@koaconfig', 'pre routes init');
  connectHandlers('@postlisten', 'post listen');
  connectHandlers('@preclose', 'end');

  // connect @interval
  const handlers = Metadata.getClassMeta(Object.getPrototypeOf(self), '@interval', Object.create(null));
  const intervals = [];
  ravelInstance.once('post listen', () => {
    for (const f of Object.keys(handlers)) {
      intervals.push(setInterval(() => {
        ravelInstance.$log.trace(`${name}: Invoking @interval ${f}`);
        handlers[f].handler.call(self);
      }, handlers[f].interval));
    }
  });
  ravelInstance.once('end', () => {
    intervals.forEach((i) => clearInterval(i));
  });

  // register middleware
  const middleware = Metadata.getClassMeta(Object.getPrototypeOf(self), '@middleware', Object.create(null));
  ravelInstance.once('post module init', () => {
    for (const m of Object.keys(middleware)) {
      if (ravelInstance[symbols.moduleFactories][m]) {
        throw new $err.DuplicateEntry(
          `Unable to register @middleware with name ${m}, which conflicts with an existing Module name`);
      } else {
        ravelInstance.$log.info(`Registering middleware with name ${m}`);
        ravelInstance[symbols.middleware][m] = {
          scope: self,
          fn: middleware[m].fn,
          options: middleware[m].options
        };
      }
    }
  });
}

module.exports = function (Ravel) {
  /**
   * Retrieve an initialized Ravel `Module` by its injection name, after `app.init()`.
   * Useful for [testing](#testing-ravel-applications).
   *
   * @param {string} name - The injection name of the module.
   */
  Ravel.prototype.module = function (name) {
    if (!this.initialized) {
      throw new this.$err.General('Cannot retrieve a Module reference from Ravel before app.init().');
    }
    return this[symbols.modules][name];
  };

  /**
   * Register a `Module` or a plain class with Ravel. Must be a file exporting a single class.
   *
   * @private
   * @param {Function} moduleClass - The class for a Module.
   */
  Ravel.prototype[symbols.loadModule] = function (moduleClass) {
    const name = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'name');
    if (name === undefined) {
      throw new this.$err.IllegalValue(`Name required for module ${moduleClass.name}`);
    }
    if (this[symbols.moduleFactories][name]) {
      // if a module with this name has already been registered, error out
      throw new this.$err.DuplicateEntry(
        `Module with name '${name}' has already been registered.`);
    }
    // store reference to this ravel instance in metadata
    Metadata.putClassMeta(moduleClass.prototype, 'ravel', 'instance', this);
    // store name in metadata
    Metadata.putClassMeta(moduleClass.prototype, 'source', 'name', name);
    // store known module with path as the key, so someone can reflect on the class
    this[symbols.registerClassFunc](name, moduleClass);
    // build injection function
    this[symbols.moduleFactories][name] = async () => {
      // perform DI on module factory, allowing for core services
      const temp = this[symbols.injector].inject(coreServices(this, name), moduleClass);
      await initModule.call(temp, this);
      // overwrite uninitialized module with the correct one
      this[symbols.modules][name] = temp;
      return temp;
    };
    this[symbols.moduleFactories][name].moduleName = name;
    this[symbols.moduleFactories][name].dependencies = this[symbols.injector].getDependencies(moduleClass);
    this[symbols.moduleFactories][name].parents = [];
    this[symbols.moduleFactories][name].children = [];

    // save uninitialized module to Ravel.modules
    // temporarily, until it is replaced by an
    // instantiated version in _moduleInit
    this[symbols.modules][name] = Object.create(null);
  };

  /**
   * Private module init.
   *
   * Performs module initialization, detecting dependency cycles
   * and executing module factories in dependency order in Ravel.init().
   *
   * @private
   */
  Ravel.prototype[symbols.moduleInit] = async function () {
    const rootFactories = Object.create(null);

    // build dependency graph
    for (const moduleName of Object.keys(this[symbols.moduleFactories])) {
      const dependencies = this[symbols.moduleFactories][moduleName].dependencies;
      const factoryDeps = [];
      for (let d = 0; d < dependencies.length; d++) {
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
        throw new this.$err.General(
          `Module instantiation failed. A cyclical dependency exists between modules ${startModule} and ${last}`);
      } else if (moduleFactory.maxDepth === undefined) {
        visitedMeta.set(moduleFactory, visitedTag);
        let maxDepth = -1;
        for (const p of moduleFactory.parents) {
          // if (!moduleFactory.parents.hasOwnProperty(p)) {continue;}
          const pDepth = p.maxDepth !== undefined
            ? p.maxDepth
            : calcDepth(p, visitedTag, startModule, moduleFactory.moduleName);
          maxDepth = Math.max(maxDepth, pDepth);
        }
        moduleFactory.maxDepth = maxDepth + 1;
      }
      return moduleFactory.maxDepth;
    };
    for (const moduleName of Object.keys(this[symbols.moduleFactories])) {
      const depth = calcDepth(this[symbols.moduleFactories][moduleName]);
      if (!instantiationOrder[depth]) {
        instantiationOrder[depth] = [];
      }
      instantiationOrder[depth].push(this[symbols.moduleFactories][moduleName]);
      this.$log.info(`Registering module with name ${moduleName}`);
    }

    // instantiate in depth order
    for (let currDepth = 0; currDepth < instantiationOrder.length; currDepth++) {
      for (let m = 0; m < instantiationOrder[currDepth].length; m++) {
        await instantiationOrder[currDepth][m]();
      }
    }
  };
};

/*!
 * Export `Module` decorator, and sub-decorators
 */
module.exports.Module = require('./decorators/module');
module.exports.Module.postinject = lifecycle.postinject;
module.exports.Module.postinit = lifecycle.postinit;
module.exports.Module.prelisten = lifecycle.prelisten;
module.exports.Module.koaconfig = lifecycle.koaconfig;
module.exports.Module.postlisten = lifecycle.postlisten;
module.exports.Module.preclose = lifecycle.preclose;
module.exports.Module.interval = lifecycle.interval;
module.exports.Module.middleware = require('./decorators/middleware');
module.exports.Module.authconfig = require('../auth/decorators/authconfig');
