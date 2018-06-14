'use strict';

const Metadata = require('../../util/meta');
const httpCodes = require('../../util/http_codes');

/**
 * The `@mapping` decorator for `Routes` classes. Indicates that
 * the decorated method should be mapped as a route handler using `koa`.
 *
 * Can also be applied at the class-level to indicate routes which do
 * nothing except return a particular status code.
 *
 * @param {symbol} verb - An HTTP verb such as `Routes.GET`, `Routes.POST`, `Routes.PUT`, or `Routes.DELETE`.
 * @param {string} path - The path for this endpoint, relative to the base path of the Routes class.
 * @param {(number | undefined)} status - A status to always return, if this is applied at the class-level.
 *                               If applied at the method-level, then the method will be used as a handler instead.
 * @param {(boolean | undefined)} suppressLog - Don't log a message describing this endpoint iff true.
 * @example
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 *
 * // &#64;Routes('/')
 * class MyRoutes {
 *   // will map to /projects
 *   // &#64;mapping(Routes.GET, 'projects')
 *   async handler (ctx) {
 *     // ctx is a koa context object
 *   }
 * }
 * @example
 * const Ravel = reuqire('ravel');
 * const Routes = Ravel.Routes;
 * const mapping = Routes.mapping;
 *
 * // class-level version will create a route 'DELETE /' which responds with 501 in this case
 * // &#64;mapping(Routes.DELETE, 'projects', Ravel.httpCodes.NOT_IMPLEMENTED)
 * // &#64;Routes('/')
 * class MyRoutes {
 * }
 */
function mapping (verb, path, status, suppressLog) {
  return function (target, key, descriptor) {
    // TODO ensure this is only used on Routes classes
    if (key === undefined) {
      // class-level
      path = path || '/';
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
    // delete target[key]
  };
}

/*!
 * Export `@mapping` decorator
 */
module.exports = mapping;
