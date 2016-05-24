'use strict';

const Metadata = require('../../util/meta');
const ApplicationError = require('../../util/application_error');

/**
 * Decorator for opening a transaction on a Route or Resource handler method.
 * Facilitates transaction-per-request.
 * @param {Array[String]} args a list of database provider names to open connections for.
 *                             will be available within the handler as the object
 *                             ctx.transaction, which will contain connections with
 *                             provider names as keys.
 */
function transaction(...args) {
  return function(target, key) {
    args.forEach((name) => {
      if (typeof name !== 'string') {
        throw new ApplicationError.IllegalValue(
          'Values supplied to @transaction decorator must be strings, and must match '+
          'the name of a registered database provider');
      }
    });
    Metadata.putMethodMeta(target, key, '@transaction', 'providers', args);
  };
}

/**
 * Populates a class with a static reference to the @transaction decorator
 */
module.exports = function(target) {
  target.transaction = transaction;
};
