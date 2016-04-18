'use strict';

const Metadata = require('../../util/meta');

/**
 * Decorator for setting the relative path of a method within a Route
 * @param {Symbol} verb an HTTP verb such as Routes.GET, Routes.POST, Routes.PUT, or Routes.DELETE
 * @param {String} the path for this endpoint, relative to the base path of the Routes class
 * @param {Number | undefined} a status to always return, if this is applied at the class-level. If applied at
 *                             the method-level, then the method will be used as a handler instead.
 */
function mapping(verb, path, status) {
  return function(target, key, descriptor) {
    if (key === undefined) {
      // class-level
      path = path ? path : '/';
      const info = {
        verb: verb,
        path: path,
        status: status
      };
      Metadata.putClassMeta(target.prototype, '@mapping', verb.toString() + ' ' + path, info);
    } else {
      // method-level
      const info = {
        verb: verb,
        path: path,
        endpoint: descriptor.value
      };
      Metadata.putMethodMeta(target, key, '@mapping', 'info', info);
    }
    // delete target[key];
  };
}

/**
 * Populates a class with a static reference to the @before decorator
 */
module.exports = function(target) {
  target.mapping = mapping;
};
