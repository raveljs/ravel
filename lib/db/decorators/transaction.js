'use strict';

const Metadata = require('../../util/meta');
const $err = require('../../util/application_error');

/**
 * The `@transaction` decorator for opening a transaction on a `Routes` or
 * `Resource` handler method. Facilitates transaction-per-request.
 * Can also be applied at the class-level to open connections for all handlers
 * in that `Route` or `Resource` class.
 *
 * Connections are available within the handler as an object `ctx.transaction`, which
 * contains connections as values and `DatabaseProvider` names as keys. Connections
 * will be closed automatically when the endpoint responds (do not close them yourself),
 * and will automatically roll-back changes if a `DatabaseProvider` supports it (generally
 * a SQL-only feature).
 *
 * @param {...string} args - A list of database provider names to open connections for.
 *
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 *
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // &#64;mapping(Routes.GET, 'app')
 *   // &#64;transaction // open all connections within this handler
 *   async appHandler (ctx) {
 *     // ctx.transaction is an object containing
 *     // keys for DatabaseProviders and values
 *     // for their open connections
 *   }
 *
 *   // &#64;mapping(Routes.GET, 'something')
 *   // &#64;transaction('mysql', 'rethinkdb') // open one or more specific connections within this handler
 *   async somethingHandler (ctx) {
 *     // can use ctx.transaction.mysql
 *     // can use ctx.transaction.rethinkdb
 *   }
 * }
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 * const Resource = require('ravel').Resource;
 *
 * // &#64;transaction('mysql') // all handlers will have ctx.transaction.mysql
 * // &#64;Resource('/')
 * class MyResource {
 *   async post (ctx) {
 *     // can use ctx.transaction.mysql
 *   }
 * }
 */
function transaction (...args) {
  // handle @transaction at the method-level without arguments
  if (args.length === 3 && typeof args[0].constructor === 'function') {
    Metadata.putMethodMeta(args[0], args[1], '@transaction', 'providers', []);
  } else if (args.length === 1 && typeof args[0] === 'function') {
    // handle @transaction at the class-level without arguments
    Metadata.putClassMeta(args[0].prototype, '@transaction', 'providers', []);
  } else {
    // handle @transaction() at the class and method-level with arguments
    return function (target, key) {
      args.forEach((name) => {
        if (typeof name !== 'string') {
          throw new $err.IllegalValue(
            'Values supplied to @transaction decorator must be strings, and must match ' +
            'the name of a registered database provider');
        }
      });
      if (key === undefined) {
        Metadata.putClassMeta(target.prototype, '@transaction', 'providers', args);
      } else {
        Metadata.putMethodMeta(target, key, '@transaction', 'providers', args);
      }
    };
  }
}

/*!
 * Export the `@transaction` decorator
 */
module.exports = transaction;
