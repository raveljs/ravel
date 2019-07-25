const Metadata = require('../../util/meta');

/**
 * Method-level decorator for `Module` methods, so that
 * they are registered as middleware which can be injected
 * automatically by `@before` or decorators created with
 * `createMiddlewareDecorator`.
 * Made available through the Module class.
 * See [`Module`](#module) for more information.
 *
 * @param {string} name - The injection name this middleware will be made available under.
 * @param {object?} options - Ravel options used to configure the middleware. If the
 *   option 'acceptsParams' is set to true then the middleware function will be treated as
 *   a factory method when used with a custom middleware decorator.
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
 *   // &#64;middleware('my-middleware', { acceptsParams: true })
 *   doSomethingMiddleware (param1) {
 *     // called once per usage in a route
 *     return async function doSomething (ctx, next) {
 *       // normal async middleware ...
 *     };
 *   }
 * }
 * //...
 * const Resource = require('ravel').Resource;
 * const myMiddleware = Resource.createMiddlewareDecorator('my-middleware');
 *
 * // &#64;Resource('/')
 * class MyResource {
 *   // &#64;myMiddleware('foo')
 *   async getAll () {
 *     //...
 *   }
 * }
 *
 * @private
 */
function middleware (name, options) {
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@middleware', name, { fn: descriptor.value, options: options });
  };
}

/**
 * @private
 */
module.exports = middleware;
