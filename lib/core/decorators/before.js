'use strict';

const $err = require('../../util/application_error');
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
 * @param {...string} rest - The property names of valid middleware available on `this`.
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 *
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const before = Routes.before;
 *
 * // &#64;Routes('/')
 * // &#64;inject('koa-bodyparser')
 * class MyRoutes {
 *   constructor (bodyParser) {
 *     this.bodyParser = bodyParser();
 *   }
 *
 *   // &#64;mapping(Routes.GET, '/projects/:id')
 *   // &#64;before('bodyParser') // method-level version only applies to this route
 *   async handler (ctx) {
 *     // in here, bodyParser will already have run,
 *     // and ctx.request.body will be populated
 *   }
 * }
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 *
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const before = Routes.before;
 *
 * // &#64;Routes('/')
 * // &#64;inject('koa-body')
 * class MyRoutes {
 *   constructor (bodyParser) {
 *     this.bodyParser = bodyParser();
 *   }
 *
 *   // &#64;mapping(Routes.GET, '/projects/:id')
 *   // parameters can be passed to middleware via parameter object
 *   // &#64;before({'bodyParser': {onerror: (err, ctx) => ctx.throw('body parse error in handler', 422)}})
 *   async handler (ctx) {
 *     // in here, bodyParser will already have run,
 *     // and ctx.request.body will be populated
 *   }
 * }
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Resource;
 * const before = Resource.before;
 *
 * // &#64;Resource('/')
 * // &#64;inject('koa-bodyparser')
 * // &#64;before('bodyParser') // class-level version applies to all routes in class.
 * class MyResource {
 *   constructor (bodyParser) {
 *     this.bodyParser = bodyParser();
 *   }
 *
 *   async get(ctx) {
 *     // in here, bodyParser will already have run,
 *     // and ctx.request.body will be populated
 *   }
 * }
 */
function before (...rest) {
  return function (target, key) {
    if (rest.length === 0) {
      throw new $err.NotFound(`Empty @before supplied on method ${key} of Resource ${typeof target}`);
    }
    // TODO ensure that this is only used on Resources and Routes
    const toInject = [];
    for (const elem of rest) {
      if (typeof elem === 'string') {
        toInject.push(elem);
      } else if (elem.constructor === Object) {
        if (Object.entries(elem).length !== 1) {
          throw new $err.IllegalValue('Objects supplied to @before decorator must contain a single entry.');
        }
        toInject.push(elem);
      } else {
        throw new $err.IllegalValue('Values supplied to @before decorator must be strings or objects.');
      }
    }
    if (key === undefined) {
      Metadata.putClassMeta(target.prototype, '@before', 'middleware', toInject);
    } else {
      Metadata.putMethodMeta(target, key, '@before', 'middleware', toInject);
    }
  };
}

/*!
 * Export the `@before` decorator
 */
module.exports = before;
