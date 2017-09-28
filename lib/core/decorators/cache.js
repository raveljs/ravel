'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * The `@cache` decorator for `Routes` and `Resource` classes. Indicates that
 * response caching middleware should be placed on the given route before the method
 * which is decorated.
 *
 * Can also be applied at the class-level to place caching middleware before *all*
 * `@mapping` handlers.
 *
 * References any middleware `AsyncFunction`s available on `this`.
 *
 * See [`cache`](#cache) for more information.
 *
 * @param {...Any} args - Options for the caching middleware, or undefined.
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 *
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const cache = Routes.cache;
 *
 * class MyRoutes extends Routes {
 *   constructor () {
 *     super('/');
 *   }
 *
 *   // &#64;mapping(Routes.GET, '/projects/:id')
 *   // &#64;cache // method-level version only applies to this route
 *   async handler (ctx) {
 *     // The response will automatically be cached when this handler is run
 *     // for the first time, and then will be served instead of running the
 *     // handler for as long as the cached response is available.
 *   }
 * }
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 * const Routes = require('ravel').Resource;
 * const cache = Resource.cache;
 *
 * // class-level version applies to all routes in class, overriding any
 * // method-level instances of the decorator.
 * // &#64;cache({expire:60;}) // expire is measured in seconds.
 * class MyResource extends Resource {
 *   constructor (bodyParser) {
 *     super('/');
 *     this.bodyParser = bodyParser();
 *   }
 *
 *   async get(ctx) {
 *     // The response will automatically be cached when this handler is run
 *     // for the first time, and then will be served instead of running the
 *     // handler for as long as the cached response is available (60 seconds).
 *   }
 * }
 */
function cache (...args) {
  // handle @cache at the method-level without arguments
  if (args.length === 3 && typeof args[0].constructor === 'function') {
    Metadata.putMethodMeta(args[0], args[1], '@cache', 'options', {});
  } else if (args.length === 1 && typeof args[0] === 'function') {
    // handle @cache at the class-level without arguments
    Metadata.putClassMeta(args[0].prototype, '@cache', 'options', {});
  } else {
    // handle @cache() at the class and method-level with arguments
    return function (target, key) {
      if (args.length > 0 && typeof args[0] !== 'object') {
        throw new ApplicationError.IllegalValue(
          'Only an options object may be supplied to the @cache decorator');
      }
      const options = args.length > 0 ? args[0] : {};
      if (key === undefined) {
        Metadata.putClassMeta(target.prototype, '@cache', 'options', options);
      } else {
        Metadata.putMethodMeta(target, key, '@cache', 'options', options);
      }
    };
  }
}

/*!
 * Export the `@cache` decorator
 */
module.exports = cache;
