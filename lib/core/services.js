'use strict';

/**
 * Instantiate a core services injection map for `@Module`s, `@Resource`s and `@Routes`.
 *
 * @private
 * @param {ravelApp} ravelInstance - A Ravel app.
 * @param {string} name - The name of the module which is the target of the injection.
 */
module.exports = function (ravelInstance, name) {
  /**
   * Core Ravel services available for injection by name into any `@Module`s, `@Resource`s or `@Routes`.
   *
   * @class Services
   * @example
   * // &#64;Module
   * // &#64;inject('$log')
   * class MyModule {
   *   constructor ($log) {
   *     this.$log = $log;
   *   }
   *
   *   aMethod () {
   *     this.$log.info('In aMethod!');
   *     //...
   *   }
   * }
   */
  const coreServices = {};

  /**
   * A reference to the ravel instance with which this Module is registered.
   *
   * @type Ravel
   * @memberof Services
   */
  coreServices['$app'] = ravelInstance;

  /**
   * Ravel's pre-packaged error types. When thrown, they will
   * trigger a corresponding HTTP response code.
   *
   * @type {Ravel.Error}
   * @memberof Services
   */
  coreServices['$err'] = ravelInstance.$err;

  /**
   * A logger for this `Module`, `Resource` or `Routes`.
   * Will log messages prefixed with the name or basepath
   * of the `Module` or `Resource`/`Routes`.
   * See [`Logger`](#logger) for more information.
   *
   * @type Logger
   * @memberof Services
   * @example
   * this.$log.trace('A trace message');
   * this.$log.verbose('A verbose message');
   * this.$log.debug('A debug message');
   * this.$log.info('A info message');
   * this.$log.warn('A warn message');
   * this.$log.error('A error message');
   * this.$log.critical('A critical message');
   * @example
   * // string interpolation is supported
   * this.$log.info('Created record with id=%s', '42');
   * @example
   * // Errors are supported
   * this.$log.error('Something bad happened!', new Error('Ahh!'));
   */
  coreServices['$log'] = ravelInstance.$log.getLogger(name);

  /**
   * A reference to the internal Ravel key-value store connection (redis).
   * See [node-redis](https://github.com/NodeRedis/node_redis) for more information.
   *
   * Since this is Ravel's own internal, long-lived connection, it is important that
   * it not be blocked or suspended by calls to `exit`, `subscribe`, `psubscribe`,
   * `unsubscribe` or `punsubscribe`.
   *
   * To retrieve an unrestricted connection to Redis, use `kvstore.clone()`.
   *
   * @type Object
   * @memberof Services
   */
  coreServices['$kvstore'] = ravelInstance.$kvstore;

  /**
   * A service which exposes an Object with a get() method,
   * which allows easy access to app.get().
   * See [`Ravel.get`](#Ravel#get) for more information.
   *
   * @type Object
   * @memberof Services
   * @example
   * this.$params.get('some ravel parameter');
   */
  coreServices['$params'] = {
    get: ravelInstance.get.bind(ravelInstance)
  };

  /**
   * Most Ravel database connections are retrieved using the transaction-per-request
   * pattern (see [`transaction`](#transaction)).
   * If, however, your application needs to initiate a connection to a database which
   * is not triggered by an HTTP request (at startup, for example) then this method is
   * the intended approach. This method is meant to yield connections in much the same
   * way as `@transaction`. See the examples below and
   * [`TransactionFactory`](#transactionfactory) for more details.
   *
   * @type TransactionFactory
   * @memberof Services
   * @example
   * const Ravel = require('ravel');
   * const inject = Ravel.inject;
   * const Module = Ravel.Module;
   * const prelisten = Module.prelisten;
   * // &#64;Module
   * // &#64;inject('$db')
   * class MyModule {
   *   constructor($db) { this.$db = $db; }
   *   // in this example, database initialization is
   *   // performed at application start-time via
   *   // the // &#64;prelisten decorator
   *   // &#64;prelisten
   *   doInitDb () {
   *     // open connections to specific, named database providers.
   *     // like // &#64;transaction, you can also supply no names (just
   *     // the async function) to open connections to ALL registered
   *     // DatabaseProviders
   *     this.$db.scoped('mysql', 'rethinkdb', async function (ctx) {
   *       // can use ctx.transaction.mysql (an open connection)
   *       // can use ctx.transaction.rethinkdb
   *     });
   *   }
   * }
   */
  coreServices['$db'] = {
    scoped: function (...args) {
      return ravelInstance.db.scoped.bind(ravelInstance.db)(...args);
    }
  };
  return coreServices;
};
