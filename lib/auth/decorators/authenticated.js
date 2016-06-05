'use strict';

const Metadata = require('../../util/meta');

/**
 * Decorator for adding authentication middleware before an endpoint
 *
 * Ensures that a user is signed in before flow proceeds to the endpoint handler.
 * Can also be used without arguments.
 *
 * @param {Object} config
 *   @param {Boolean} redirect should redirect to app.get('login route') if user is not signed in
 *   @param {Boolean} register register user automatically if they are not registerd
 *                             (rather than failing and throwing an ApplicationError.Authorization)
 */
function authenticated(...args) {
  if (args.length === 3 && typeof args[0].constructor === 'function') {
    Metadata.putMethodMeta(args[0], args[1], '@authenticated', 'config', Object.create(null));
  } else if (args.length === 1 && typeof args[0] === 'function') {
    // handle @authenticated at the class-level without arguments
    Metadata.putClassMeta(args[0].prototype, '@authenticated', 'config', Object.create(null));
  } else {
    const config = args[0] ? args[0] : Object.create(null);
    return function(target, key) {
      if (key === undefined) {
        Metadata.putClassMeta(target.prototype, '@authenticated', 'config', config);
      } else {
        Metadata.putMethodMeta(target, key, '@authenticated', 'config', config);
      }
    };
  }
};

/**
 * Populates a class with a static reference to the @authenticated decorator
 */
module.exports = function(target) {
  target.authenticated = authenticated;
};
