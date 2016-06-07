'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const lifeycle = require('./decorators/lifecycle');

const sInit = Symbol.for('_init');

/**
 * `Module`s are plain old node.js modules exporting a single class which encapsulates
 * application logic. `Module`s support dependency injection of core Ravel services and
 * other Modules alongside npm dependencies *(no relative `require`'s!)*.
 *
 * `Module`s are instantiated safely in dependency-order, and cyclical
 * dependencies are detected automatically.
 *
 * @example
 *   const inject = require('ravel').inject;
 *   const Module = require('ravel').Module;
 *   const postinit = Module.postinit;
 *
 *   &#64;inject('path', 'fs', 'custom-module')
 *   class MyModule extends Module {
 *     constructor(path, fs, custom) {
 *       super();
 *       this.path = path;
 *       this.fs = fs;
 *       this.custom = custom;
 *     }
 *
 *     aMethod() {
 *       //...
 *     }
 *   }
 */
class Module {
  /**
   * ## Lifecycle decorators
   */
  /**
   * Methods decorated with `@postinit` will fire after Ravel.init()
   * @example
   *   const Module = require('ravel').Module;
   *   const postinit = Module.postinit;
   *   class MyModule extends Module {
   *     &#64;postinit
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  static get postinit() { return lifeycle.postinit; }

  /**
   * Methods decorated with `@prelisten` will fire at the beginning of Ravel.listen()
   * @example
   *   const Module = require('ravel').Module;
   *   const prelisten = Module.prelisten;
   *   class MyModule extends Module {
   *     &#64;prelisten
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  static get prelisten() { return lifeycle.prelisten; }

  /**
   * Methods decorated with `@postlisten` will fire at the end of Ravel.listen()
   * @example
   *   const Module = require('ravel').Module;
   *   const postlisten = Module.postlisten;
   *   class MyModule extends Module {
   *     &#64;postlisten
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  static get postlisten() { return lifeycle.postlisten; }

  /**
   * Methods decorated with `@preclose` will fire at the beginning of Ravel.close()
   * @example
   *   const Module = require('ravel').Module;
   *   const preclose = Module.preclose;
   *   class MyModule extends Module {
   *     &#64;preclose
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  static get preclose() { return lifeycle.preclose; }

  /**
   * A reference to the ravel instance with which this Module is registered
   */
  get app() {
    return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'ravel', 'instance');
  }

  /**
   * The injection name for this module
   */
  get name() { return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'source', 'name'); }

  /**
   * Ravel's pre-packaged error types
   */
  get ApplicationError() {
    return this.app.ApplicationError;
  }

  /**
   * The logger for this `Module`. Will log messages prefixed with the `Module` name.
   */
  get log() {
    return this.app.log.getLogger(this.name);
  }

  /**
   * The active Ravel key-value store connection (redis).
   * See [util/kvstore](../util/kvstore.js.html) for more information.
   */
  get kvstore() {
    return this.app.kvstore;
  }

  /**
   * An Object with a get() method, which allows easy access to ravel.get()
   * See [core/params](params.js.html) for more information.
   * @example
   *   this.params.get('some ravel parameter');
   */
  get params() {
    const ravelInstance = this.app;
    return {
      get: ravelInstance.get.bind(ravelInstance)
    };
  }

  /**
   * An Object with a scoped() method, which allows easy access to ravel.db.scoped()
   * See [db/database](../db/database.js.html) for more information.
   * @example
   *   this.db.scoped('mysql', function*() {
   *     // this.mysql will be an open database connection
   *   });
   */
  get db() {
    const ravelInstance = this.app;
    return {
      scoped: function(gen) {
        return ravelInstance.db.scoped.bind(ravelInstance.db)(gen);
      }
    };
  }
}

/**
 * Initializer for this `Module`
 * @api private
 */
Module.prototype[sInit] = function(ravelInstance) {
  // connect any Ravel lifecycle handlers to the appropriate events
  const self = this;
  function connectHandlers(decorator, event) {
    const handlers = Metadata.getClassMeta(Object.getPrototypeOf(self), decorator, Object.create(null));
    for (let f of Object.keys(handlers)) {
      ravelInstance.once(event, handlers[f].bind(self));
    }
  }
  connectHandlers('@postinit', 'post init');
  connectHandlers('@prelisten', 'pre listen');
  connectHandlers('@postlisten', 'post listen');
  connectHandlers('@preclose', 'end');
};

/**
 * add in `@authconfig` decorator as static property
 * See [auth/authconfig](../auth/authconfig.js.html) for more information.
 * @example
 *   const Module = require('ravel').Module;
 *   const authconfig = Module.authconfig;
 *
 *   &#64;authconfig
 *   class MyAuthConfigModule extends Module {}
 *
 */
require('../auth/decorators/authconfig')(Module);

/*!
 * Populate `Ravel` class with `app.module` method.
 * @external Ravel
 */
module.exports = function(Ravel) {

  /**
   * Register a module with Ravel
   *
   * A module is a pure node.js javascript class consisting of functions with no
   * network-related functionality, suitable for unit-testing.
   *
   * Modules should use injection to refer to other Ravel modules and NPM
   * dependencies.
   *
   * @memberof Ravel
   * @param {String} modulePath The path to the module
   * @param {String} name the name for the module, which will be used for dependency injection
   * @example
   *   app.module('./modules/mymodule', 'mymodule');
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
      // store reference to this ravel instance in metadata
      Metadata.putClassMeta(moduleClass.prototype, 'ravel', 'instance', this);
      // store name in metadata
      Metadata.putClassMeta(moduleClass.prototype, 'source', 'name', name);
      // store path to module file in metadata
      Metadata.putClassMeta(moduleClass.prototype, 'source', 'path', modulePath);
      // store known module with path as the key, so someone can reflect on the class
      this[symbols.registerClassFunc](modulePath, moduleClass);
      // build injection function
      this[symbols.moduleFactories][name] = () => {
        // perform DI on module factory
        const temp = this[symbols.injector].inject({},moduleClass);
        temp[sInit](this);
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
   * @memberof Ravel
   * @api private
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

/**
 * Export Module class
 */
module.exports.Module = Module;
