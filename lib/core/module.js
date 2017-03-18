'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const lifecycle = require('./decorators/lifecycle');

const sInit = Symbol.for('_init');

/**
 * `Module`s are plain old node.js modules exporting a single class which encapsulates
 * application logic and middleware. `Module`s support dependency injection of core
 * Ravel services and other Modules alongside npm dependencies *(no relative `require`'s!)*.
 *
 * `Module`s are instantiated safely in dependency-order, and cyclical
 * dependencies are detected automatically.
 *
 * @example
 * const inject = require('ravel').inject;
 * const Module = require('ravel').Module;
 *
 * // &#64;inject('path', 'fs', 'custom-module')
 * class MyModule extends Module {
 *   constructor (path, fs, custom) {
 *     super();
 *     this.path = path;
 *     this.fs = fs;
 *     this.custom = custom;
 *   }
 *
 *   aMethod () {
 *     this.log.info('In aMethod!');
 *     //...
 *   }
 * }
 *
 * module.exports = MyModule
 *
 * @example
 * const inject = require('ravel').inject;
 * const Module = require('ravel').Module;
 *
 * // &#64;inject('path', 'fs', 'custom-module')
 * class MyModule {
 *   constructor (path, fs, custom) {
 *     this.path = path;
 *     this.fs = fs;
 *     this.custom = custom;
 *   }
 *
 *   aMethod () {
 *     // since we didn't extend Ravel.Module, we can't use this.log here.
 *   }
 * }
 *
 * module.exports = MyModule
 *
 * @example
 * const inject = require('ravel').inject;
 * const Module = require('ravel').Module;
 *
 * class MyMiddleware extends Module {
 *
 *   async someMiddleware (ctx, next) {
 *     //...
 *     await next;
 *   }
 * }
 *
 * module.exports = MyModule
 */
class Module {
  /**
   * ## Lifecycle decorators
   */
  /**
   * Methods decorated with `@postinit` will fire after Ravel.init()
   * @type {Decorator}
   * @example
   * const Module = require('ravel').Module;
   * const postinit = Module.postinit;
   * class MyModule extends Module {
   *   // &#64;postinit
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  static get postinit () { return lifecycle.postinit; }

  /**
   * Methods decorated with `@prelisten` will fire at the beginning of Ravel.listen()
   * @type {Decorator}
   * @example
   * const Module = require('ravel').Module;
   * const prelisten = Module.prelisten;
   * class MyModule extends Module {
   *   // &#64;prelisten
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  static get prelisten () { return lifecycle.prelisten; }

  /**
   * Methods decorated with `@koaconfig` will fire after Ravel has set up `koa`
   * with all of its core global middleware (such as for error handling and
   * authentication/authorization) but *before* any `Routes` or `Resource`
   * classes are loaded. Ravel is intentionally conservative with global
   * middleware to keep your routes as computationally efficient as possible.
   * It is *highly* recommended that Ravel apps follow the same heuristic,
   * declaring middleware in `Routes` or `Resource` classes at the class or
   * method level (as necessary). If, however, global middleware is desired,
   * `@koaconfig` provides the appropriate hook for configuration.
   *
   * @example
   * const Module = require('ravel').Module;
   * const postlisten = Module.postlisten;
   * class MyModule extends Module {
   *   // &#64;koaconfig
   *   configureKoa (koaApp) { // a reference to the internal koa app object
   *     //...
   *   }
   * }
   */
  static get koaconfig () { return lifecycle.koaconfig; }

  /**
   * Methods decorated with `@postlisten` will fire at the end of Ravel.listen()
   * @type {Decorator}
   * @example
   * const Module = require('ravel').Module;
   * const postlisten = Module.postlisten;
   * class MyModule extends Module {
   *   // &#64;postlisten
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  static get postlisten () { return lifecycle.postlisten; }

  /**
   * Methods decorated with `@preclose` will fire at the beginning of Ravel.close()
   * @type {Decorator}
   * @example
   * const Module = require('ravel').Module;
   * const preclose = Module.preclose;
   * class MyModule extends Module {
   *   // &#64;preclose
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  static get preclose () { return lifecycle.preclose; }

  /**
   * A reference to the ravel instance with which this Module is registered
   * @type {Ravel}
   */
  get app () {
    return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'ravel', 'instance');
  }

  /**
   * The injection name for this module
   * @type {String}
   */
  get name () { return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'source', 'name'); }

  /**
   * Ravel's pre-packaged error types
   * @type {Ravel.Error}
   */
  get ApplicationError () {
    return this.app.ApplicationError;
  }

  /**
   * The logger for this `Module`. Will log messages prefixed with the `Module` name.
   * See [`Logger`](#logger) for more information.
   * @type {Logger}
   * @example
   * this.log.trace('A trace message');
   * this.log.verbose('A verbose message');
   * this.log.debug('A debug message');
   * this.log.info('A info message');
   * this.log.warn('A warn message');
   * this.log.error('A error message');
   * this.log.critical('A critical message');
   * @example
   * // string interpolation is supported
   * this.log.info('Created record with id=%s', '42');
   * @example
   * // Errors are supported
   * this.log.error('Something bad happened!', new Error('Ahh!'));
   */
  get log () {
    return this.app.log.getLogger(this.name);
  }

  /**
   * A reference to the internal Ravel key-value store connection (redis).
   * See [node-redis](https://github.com/NodeRedis/node_redis) for more information.
   * @type {Object}
   */
  get kvstore () {
    return this.app.kvstore;
  }

  /**
   * An Object with a get() method, which allows easy access to ravel.get()
   * See [`Ravel.get`](#Ravel#get) for more information.
   * @type {Object}
   * @example
   * this.params.get('some ravel parameter');
   */
  get params () {
    const ravelInstance = this.app;
    return {
      get: ravelInstance.get.bind(ravelInstance)
    };
  }

  /**
   * Most Ravel database connections are retrieved using the transaction-per-request
   * pattern (see [`transaction`](#transaction)).
   * If, however, your application needs to initiate a connection to a database which
   * is not triggered by an HTTP request (at startup, for example) then this method is
   * the intended approach. This method is meant to yield connections in much the same
   * way as `@transaction`. See the examples below for more details:
   *
   * @type {Object}
   * @example
   * const Module = require('ravel').Module;
   * const prelisten = Module.prelisten;
   *
   * class MyModule extends Module {
   *
   *   // in this example, database initialization is
   *   // performed at application start-time via
   *   // the // &#64;prelisten decorator
   *   // &#64;prelisten
   *   doInitDb () {
   *     // open connections to specific, named database providers.
   *     // like // &#64;transaction, you can also supply no names (just
   *     // the async function) to open connections to ALL registered
   *     // DatabaseProviders
   *     this.db.scoped('mysql', 'rethinkdb', async function (ctx) {
   *       // can use ctx.transaction.mysql
   *       // can use ctx.transaction.rethinkdb
   *     });
   *   }
   * }
   * @example
   * this.db.scoped('mysql', async function (ctx) {
   *   // ctx.transaction.mysql will be an open database connection
   * })
   */
  get db () {
    const ravelInstance = this.app;
    return {
      scoped: function (...args) {
        return ravelInstance.db.scoped.bind(ravelInstance.db)(...args);
      }
    };
  }
}

/**
 * Initializer for this `Module`
 * @private
 */
Module.prototype[sInit] = function (ravelInstance) {
  // connect any Ravel lifecycle handlers to the appropriate events
  const self = this;
  function connectHandlers (decorator, event) {
    const handlers = Metadata.getClassMeta(Object.getPrototypeOf(self), decorator, Object.create(null));
    for (let f of Object.keys(handlers)) {
      ravelInstance.once(event, handlers[f].bind(self));
    }
  }
  connectHandlers('@postinit', 'post init');
  connectHandlers('@prelisten', 'pre listen');
  connectHandlers('@koaconfig', 'pre routes init');
  connectHandlers('@postlisten', 'post listen');
  connectHandlers('@preclose', 'end');
};

/**
 * The `@authconfig` decorator for `Module` classes. Tags the target
 * `Module` as providing implementations of `@authconfig`-related methods.
 * See [`authconfig`](#authconfig) for more information.
 * @example
 * const Module = require('ravel').Module;
 * const authconfig = Module.authconfig;
 *
 * // &#64;authconfig
 * class MyAuthConfigModule extends Module {}
 *
 */
Module.authconfig = require('../auth/decorators/authconfig');

/*!
 * Populate `Ravel` class with `app.module` method.
 * @external Ravel
 */
module.exports = function (Ravel) {
  /**
   * Register a `Module` or a plain class with Ravel. Must be a flie exporting a single class.
   *
   * This method is not generally meant to be used directly, unless you wish to give
   * your `Module` a custom name. Instead, use `app.modules` (see [`Ravel.modules`](#Ravel#modules)).
   *
   * @param {String} modulePath the path to the module
   * @param {String} name the name for the module, which will be used for dependency injection
   * @example
   * app.module('./modules/mymodule', 'mymodule')
   */
  Ravel.prototype.module = function (modulePath, name) {
    if (name === undefined) {
      // if no name is supplied, error out
      throw new this.ApplicationError.IllegalValue(`Name required for module at ${modulePath}`);
    } else if (this[symbols.moduleFactories][name]) {
      // if a module with this name has already been regsitered, error out
      throw new this.ApplicationError.DuplicateEntry(
        `Module with name '${name}' has already been registered.`);
    }
    const absPath = upath.isAbsolute(modulePath) ? modulePath : upath.join(this.cwd, modulePath);
    const moduleClass = require(absPath);
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
      const temp = this[symbols.injector].inject({}, moduleClass);
      if (moduleClass.prototype instanceof Module) {
        temp[sInit](this);
      }
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
   * Private module init
   *
   * Performs module initialization, detecting dependency cycles
   * and executing module factories in dependency order in
   * Ravel.init()
   * @private
   */
  Ravel.prototype[symbols.moduleInit] = function () {
    const rootFactories = Object.create(null);

    // build dependency graph
    for (let moduleName of Object.keys(this[symbols.moduleFactories])) {
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
        throw new this.ApplicationError.General(
          `Module instantiation failed. A cyclical dependency exists between modules ${startModule} and ${last}`);
      } else if (moduleFactory.maxDepth === undefined) {
        visitedMeta.set(moduleFactory, visitedTag);
        let maxDepth = -1;
        for (let p of moduleFactory.parents) {
          // if (!moduleFactory.parents.hasOwnProperty(p)) {continue;}
          let pDepth = p.maxDepth !== undefined
            ? p.maxDepth
            : calcDepth(p, visitedTag, startModule, moduleFactory.moduleName);
          maxDepth = Math.max(maxDepth, pDepth);
        }
        moduleFactory.maxDepth = maxDepth + 1;
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
    for (let currDepth = 0; currDepth < instantiationOrder.length; currDepth++) {
      for (let m = 0; m < instantiationOrder[currDepth].length; m++) {
        instantiationOrder[currDepth][m]();
      }
    }
  };
};

/*!
 * Export `Module` class
 */
module.exports.Module = Module;
