'use strict';

const Metadata = require('../../util/meta');
const ApplicationError = require('../../util/application_error');

/**
 * The `@transaction` decorator for opening a transaction on a Route or
 * Resource handler method. Facilitates transaction-per-request.
 * Can also be applied at the class-level to open connections for all handlers
 * in that Route or Resource class.
 * @param {...String} args a list of database provider names to open connections for.
 *                         will be available within the handler as the object
 *                         ctx.transaction, which will contain connections with
 *                         provider names as keys.
 * @example
 *   // Note: decorator works the same way on Routes or Resource classes
 *   const Routes = require('ravel').Routes;
 *   const mapping = Routes.mapping;
 *
 *   class MyRoutes extends Routes {
 *     constructor() {
 *       super('/');
 *     }
 *
 *     &#64;mapping(Routes.GET, 'app');
 *     &#64;transaction // open all connections within this handler
 *     appHandler(ctx) {
 *       // ctx.transaction is an object containing
 *       // keys for DatabaseProviders and values
 *       // for their open connections
 *     }
 *
 *     &#64;mapping(Routes.GET, 'something');
 *     &#64;transaction('mysql', 'rethinkdb') // open one or more specific connections within this handler
 *     somethingHandler(ctx) {
 *       // can use ctx.transaction.mysql
 *       // can use ctx.transaction.rethinkdb
 *     }
 *   }
 * @example
 *   // Note: decorator works the same way on Routes or Resource classes
 *   const Resource = require('ravel').Resource;
 *
 *   &#64;transaction('mysql') // all handlers will have ctx.transaction.mysql
 *   class MyResource extends Resource {
 *     constructor() {
 *       super('/');
 *     }
 *
 *     post(ctx) {
 *       // can use ctx.transaction.mysql
 *     }
 *   }
 */
function transaction(...args) {
  // handle @transaction at the method-level without arguments
  if (args.length === 3 && typeof args[0].constructor === 'function') {
    Metadata.putMethodMeta(args[0], args[1], '@transaction', 'providers', []);
  } else if (args.length === 1 && typeof args[0] === 'function') {
    // handle @transaction at the class-level without arguments
    Metadata.putClassMeta(args[0].prototype, '@transaction', 'providers', []);
  } else {
    // handle @transaction() at the class and method-level with arguments
    return function(target, key) {
      args.forEach((name) => {
        if (typeof name !== 'string') {
          throw new ApplicationError.IllegalValue(
            'Values supplied to @transaction decorator must be strings, and must match '+
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

/**
 * Export the `@transaction` decorator
 */
module.exports = transaction;
