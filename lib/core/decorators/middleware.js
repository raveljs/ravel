const Metadata = require('../../util/meta');

/**
 * Method-level decorator for `Module` methods, so that
 * they are registered as middleware which can be injected
 * automatically by `@before`.
 * Made available through the Module class.
 * See [`Module`](#module) for more information.
 *
 * @param {string} name - The injection name this middleware will be made available under.
 * @param {boolean} isFactory - Whether or not this is a middleware factory (a function that returns middleware).
 * @example
 * const Module = require('ravel').Module;
 * const middleware = Module.middleware;
 * // &#64;Module('mymodule')
 * class MyModule {
 *   // &#64;middleware('my-middleware')
 *   async doSomething (ctx, next) {
 *     //...
 *   }
 * }
 * //...
 * const Resource = require('ravel').Resource;
 * const before = Resource.before;
 * // &#64;Resource('/')
 * class MyResource {
 *   // &#64;before('my-middleware')
 *   async getAll () {
 *     //...
 *   }
 * }
 *
 * @example
 * const Module = require('ravel').Module;
 * const middleware = Module.middleware;
 * // &#64;Module('mymodule')
 * class MyModule {
 *   // &#64;middleware('my-middleware', true)
 *   doSomethingFactory (word, number) {
 *     return async function (ctx, next) {
 *       //...
 *     };
 *   }
 * }
 * //...
 * const Resource = require('ravel').Resource;
 * const before = Resource.before;
 * // &#64;Resource('/')
 * class MyResource {
 *   // &#64;before('my-middleware', 'hello', 12)
 *   async getAll () {
 *     //...
 *   }
 * }
 * @private
 */
function middleware (name, isFactory = false) {
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@middleware', name, {fn: descriptor.value, isFactory: isFactory});
  };
}

/**
 * @private
 */
module.exports = middleware;
