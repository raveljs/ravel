'use strict';

const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');
const lifecycle = require('./decorators/lifecycle');

// TODO remove
// class Module {
//   /**
//    * A reference to the ravel instance with which this Module is registered.
//    *
//    * @type Ravel
//    */
//   get app () {
//     return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'ravel', 'instance');
//   }

//   /**
//    * The injection name for this module.
//    *
//    * @type string
//    */
//   get name () { return Metadata.getClassMetaValue(Object.getPrototypeOf(this), 'source', 'name'); }

//   /**
//    * Ravel's pre-packaged error types.
//    *
//    * @type {Ravel.Error}
//    */
//   get ApplicationError () {
//     return this.app.ApplicationError;
//   }

//   /**
//    * The logger for this `Module`. Will log messages prefixed with the `Module` name.
//    * See [`Logger`](#logger) for more information.
//    *
//    * @type Logger
//    * @example
//    * this.log.trace('A trace message');
//    * this.log.verbose('A verbose message');
//    * this.log.debug('A debug message');
//    * this.log.info('A info message');
//    * this.log.warn('A warn message');
//    * this.log.error('A error message');
//    * this.log.critical('A critical message');
//    * @example
//    * // string interpolation is supported
//    * this.log.info('Created record with id=%s', '42');
//    * @example
//    * // Errors are supported
//    * this.log.error('Something bad happened!', new Error('Ahh!'));
//    */
//   get log () {
//     return this.app.log.getLogger(this.name);
//   }

//   /**
//    * A reference to the internal Ravel key-value store connection (redis).
//    * See [node-redis](https://github.com/NodeRedis/node_redis) for more information.
//    *
//    * Since this is Ravel's own internal, long-lived connection, it is important that
//    * it not be blocked or suspended by calls to `exit`, `subcribe`, `psubscribe`,
//    * `unsubscribe` or `punsubscribe`.
//    *
//    * To retrieve an unrestricted connetion to Redis, use `kvstore.clone()`.
//    *
//    * @type Object
//    */
//   get kvstore () {
//     return this.app.kvstore;
//   }

//   /**
//    * An Object with a get() method, which allows easy access to ravel.get().
//    * See [`Ravel.get`](#Ravel#get) for more information.
//    *
//    * @type Object
//    * @example
//    * this.params.get('some ravel parameter');
//    */
//   get params () {
//     const ravelInstance = this.app;
//     return {
//       get: ravelInstance.get.bind(ravelInstance)
//     };
//   }

//   /**
//    * Most Ravel database connections are retrieved using the transaction-per-request
//    * pattern (see [`transaction`](#transaction)).
//    * If, however, your application needs to initiate a connection to a database which
//    * is not triggered by an HTTP request (at startup, for example) then this method is
//    * the intended approach. This method is meant to yield connections in much the same
//    * way as `@transaction`. See the examples below and
//    * [`TransactionFactory`](#transactionfactory) for more details.
//    *
//    * @type TransactionFactory
//    * @example
//    * const Module = require('ravel').Module;
//    * const prelisten = Module.prelisten;
//    *
//    * class MyModule extends Module {
//    *
//    *   // in this example, database initialization is
//    *   // performed at application start-time via
//    *   // the // &#64;prelisten decorator
//    *   // &#64;prelisten
//    *   doInitDb () {
//    *     // open connections to specific, named database providers.
//    *     // like // &#64;transaction, you can also supply no names (just
//    *     // the async function) to open connections to ALL registered
//    *     // DatabaseProviders
//    *     this.db.scoped('mysql', 'rethinkdb', async function (ctx) {
//    *       // can use ctx.transaction.mysql (an open connection)
//    *       // can use ctx.transaction.rethinkdb
//    *     });
//    *   }
//    * }
//    */
//   get db () {
//     const ravelInstance = this.app;
//     return {
//       scoped: function (...args) {
//         return ravelInstance.db.scoped.bind(ravelInstance.db)(...args);
//       }
//     };
//   }
// }

/*!
 * Initializer for this `Module`.
 *
 * @private
 */
function initModule (ravelInstance) {
  const self = this;
  // connect any Ravel lifecycle handlers to the appropriate events
  function connectHandlers (decorator, event) {
    const handlers = Metadata.getClassMeta(Object.getPrototypeOf(self), decorator, Object.create(null));
    for (const f of Object.keys(handlers)) {
      ravelInstance.once(event, (...args) => {
        self.log.trace(`Invoking ${decorator} ${f}`);
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
        self.log.trace(`Invoking @interval ${f}`);
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
        throw new this.ApplicationError.DuplicateEntry(
          `Unable to register @middleware with name ${m}, which conflicts with an existing Module name`);
      } else {
        this.log.info(`Registering middleware with name ${m}`);
        ravelInstance[symbols.middleware][m] = middleware[m].bind(self);
      }
    }
  });
}

module.exports = function (Ravel) {
  /**
   * Register a `Module` or a plain class with Ravel. Must be a file exporting a single class.
   *
   * @private
   * @param {string} modulePath - The path to the module.
   * @param {string} computedName - The name for the module, which will be used for dependency injection
   *                                if no custom name is specified.
   */
  // TODO make module() private via symbol
  Ravel.prototype.module = function (moduleClass) {
    const name = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'name');
    if (Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type') !== 'Module') {
      throw new this.ApplicationError.IllegalValue(`${moduleClass.name} is not decorated with @Module`);
    } else if (name === undefined) {
      throw new this.ApplicationError.IllegalValue(`Name required for module ${moduleClass.name}`);
    }
    if (this[symbols.moduleFactories][name]) {
      // if a module with this name has already been registered, error out
      throw new this.ApplicationError.DuplicateEntry(
        `Module with name '${name}' has already been registered.`);
    }
    // store reference to this ravel instance in metadata
    Metadata.putClassMeta(moduleClass.prototype, 'ravel', 'instance', this);
    // store name in metadata
    Metadata.putClassMeta(moduleClass.prototype, 'source', 'name', name);
    // store known module with path as the key, so someone can reflect on the class
    this[symbols.registerClassFunc](name, moduleClass);
    // build injection function
    this[symbols.moduleFactories][name] = () => {
      // perform DI on module factory
      const temp = this[symbols.injector].inject({
        // TODO inject log, db, etc.
      }, moduleClass);
      initModule.call(temp, this);
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
  Ravel.prototype[symbols.moduleInit] = function () {
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
        throw new this.ApplicationError.General(
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
      this.log.info(`Registering module with name ${moduleName}`);
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
 * Export `Module` decorator, and sub-decorators
 */
module.exports.Module = require('./decorators/module');
module.exports.Module.postinit = lifecycle.postinit;
module.exports.Module.prelisten = lifecycle.prelisten;
module.exports.Module.koaconfig = lifecycle.koaconfig;
module.exports.Module.postlisten = lifecycle.postlisten;
module.exports.Module.preclose = lifecycle.preclose;
module.exports.Module.interval = lifecycle.interval;
module.exports.Module.middleware = require('./decorators/middleware');
module.exports.Module.authconfig = require('../auth/decorators/authconfig');
