const Metadata = require('../../util/meta');

/**
 * Method-level decorator for `Module` methods, so that
 * they are registered as middleware which can be injected
 * automatically by `@before`.
 * Made available through the Module class.
 * See [`Module`](#module) for more information.
 *
 * @param {string} name - The injection name this middlware will be made available under.
 * @example
 * const Module = require('ravel').Module;
 * const middleware = Module.middleware;
 * class MyModule extends Module {
 *   // &#64;middleware('my-middleware')
 *   async doSomething (ctx, next) {
 *     //...
 *   }
 * }
 * //...
 * const Resource = require('ravel').Resource;
 * const before = Resource.before;
 * class MyResource extends Resource {
 *   // &#64;before('my-middleware')
 *   async getAll () {
 *     //...
 *   }
 * }
 *
 * @private
 */
function middleware (name) {
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@middleware', name, descriptor.value);
  };
}

/**
 * @private
 */
module.exports = middleware;
