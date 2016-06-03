'use strict';

const Metadata = require('../../util/meta');
const ApplicationError = require('../../util/application_error');

/**
 * Decorator for opening a transaction on a Route or Resource handler method.
 * Facilitates transaction-per-request.
 * Can also be applied at the class-level to open connections for all handlers
 * in that Route or Resource class.
 * @param {Array[String]} args a list of database provider names to open connections for.
 *                             will be available within the handler as the object
 *                             ctx.transaction, which will contain connections with
 *                             provider names as keys.
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
 * Populates a class with a static reference to the @transaction decorator
 */
module.exports = function(target) {
  target.transaction = transaction;
};
