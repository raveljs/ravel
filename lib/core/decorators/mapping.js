'use strict';

const Metadata = require('../../util/meta');
const httpCodes = require('../../util/http_codes');
const $err = require('../../util/application_error');

/**
 * The `@mapping` decorator for `Routes` classes. Indicates that
 * the decorated method should be mapped as a route handler using `koa`.
 *
 * Can also be applied at the class-level to indicate routes which do
 * nothing except return a particular status code.
 *
 * @param {symbol} verb - An HTTP verb such as `Routes.HEAD`, `Routes.GET`, `Routes.POST`,
 *                        `Routes.PUT`, `Routes.PATCH`, or `Routes.DELETE`.
 * @param {string} path - The path for this endpoint, relative to the base path of the Routes class.
 * @param {object} config - Options for this mapping.
 * @param {(number | undefined)} config.status - A status to always return, if this is applied at the class-level.
 *                               Not supported at the method level.
 * @param {(boolean | undefined)} config.suppressLog - Don't log a message describing this endpoint iff true.
 * @param {(boolean | undefined)} config.catchAll - Whether or not this is a catch-all mapping, matching routes
 *                                                 with additional path components after the initial pattern match.
 *                                                 This parameter is only supported at the method-level.
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
 * const Ravel = require('ravel');
 * const Routes = Ravel.Routes;
 * const mapping = Routes.mapping;
 *
 * // class-level version will create a route 'DELETE /' which responds with 501 in this case
 * // &#64;mapping(Routes.DELETE, 'projects', { status: Ravel.httpCodes.NOT_IMPLEMENTED })
 * // &#64;Routes('/')
 * class MyRoutes {
 * }
 */
function mapping (verb, path, config = {}) {
  return function (target, key, descriptor) {
    // TODO ensure this is only used on Routes classes
    if (key === undefined) {
      if (config.catchAll !== undefined) {
        throw new $err.IllegalValue('config.catchAll is not supported at the class-level');
      }
      // class-level
      path = path || '/';
      const info = {
        verb: verb,
        path: path,
        status: config.status !== undefined ? config.status : httpCodes.NOT_IMPLEMENTED,
        suppressLog: config.suppressLog
      };
      Metadata.putClassMeta(target.prototype, '@mapping', verb.toString() + ' ' + path, info);
    } else {
      if (config.status !== undefined) {
        throw new $err.IllegalValue('config.status is not supported at the method-level');
      }
      // method-level
      const info = {
        verb: verb,
        path: path,
        endpoint: descriptor.value,
        suppressLog: config.suppressLog,
        catchAll: config.catchAll
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
