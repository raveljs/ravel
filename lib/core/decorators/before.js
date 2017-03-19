'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * The `@before` decorator for `Routes` and `Resource` classes. Indicates that
 * certain middleware should be placed on the given route before the method
 * which is decorated.
 *
 * Can also be applied at the class-level to place middleware before *all*
 * `@mapping` handlers.
 *
 * References any middleware `AsyncFunction`s available on `this`.
 *
 * See [`before`](#before) for more information.
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 *
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const before = Routes.before;
 *
 * // &#64;inject('koa-convert', 'koa-better-body')
 * class MyRoutes extends Routes {
 *   constructor (convert, bodyParser) {
 *     super('/');
 *     this.bodyParser = convert(bodyParser());
 *   }
 *
 *   // &#64;mapping(Routes.GET, '/projects/:id')
 *   // &#64;before('bodyParser') // method-level version only applies to this route
 *   async handler (ctx) {
 *     // in here, bodyParser will already have run,
 *     // and ctx.body will be populated
 *   }
 * }
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Resource;
 * const before = Resource.before;
 *
 * // &#64;inject('koa-convert', 'koa-better-body')
 * // &#64;before('bodyParser') // class-level version applies to all routes in class.
 * class MyResource extends Resource {
 *   constructor (convert, bodyParser) {
 *     super('/');
 *     this.bodyParser = convert(bodyParser());
 *   }
 *
 *   async get(ctx) {
 *     // in here, bodyParser will already have run,
 *     // and ctx.body will be populated
 *   }
 * }
 */
function before (...rest) {
  for (let r of rest) {
    if (typeof r !== 'string') {
      throw new ApplicationError.IllegalValue('Values supplied to @before decorator must be strings.');
    }
  }

  return function (target, key) {
    // TODO ensure that this is only used on Resources and Routes
    if (rest.length === 0) {
      throw new ApplicationError.NotFound(`Empty @before supplied on method ${key} of Resource ${typeof target}`);
    } else if (key === undefined) {
      Metadata.putClassMeta(target.prototype, '@before', 'middleware', rest);
    } else {
      Metadata.putMethodMeta(target, key, '@before', 'middleware', rest);
    }
  };
}

/*!
 * Export the `@before` decorator
 */
module.exports = before;
