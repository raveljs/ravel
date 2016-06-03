'use strict';

const Metadata = require('../../util/meta');
const httpCodes = require('../../util/http_codes');

/**
 * Decorator for setting the relative path of a method within a Route
 * @param {Symbol} verb an HTTP verb such as Routes.GET, Routes.POST, Routes.PUT, or Routes.DELETE
 * @param {String} path the path for this endpoint, relative to the base path of the Routes class
 * @param {Number | undefined} status a status to always return, if this is applied at the class-level. If applied at
 *                             the method-level, then the method will be used as a handler instead.
 * @param {Boolean | undefined} suppressLog don't log a message describing this endpoint iff true
 */
function mapping(verb, path, status, suppressLog) {
  return function(target, key, descriptor) {
    if (key === undefined) {
      // class-level
      path = path ? path : '/';
      const info = {
        verb: verb,
        path: path,
        status: status !== undefined ? status : httpCodes.NOT_IMPLEMENTED,
        suppressLog: suppressLog
      };
      Metadata.putClassMeta(target.prototype, '@mapping', verb.toString() + ' ' + path, info);
    } else {
      // method-level
      const info = {
        verb: verb,
        path: path,
        endpoint: descriptor.value,
        suppressLog: suppressLog
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
