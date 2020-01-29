'use strict';

const upath = require('upath');
const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * Provides Ravel with a simple mechanism for registering routes, which should generally only be used
 * for serving templated pages or static content (not for building RESTful APIs, for which `Ravel.Resource`
 * is more applicable). Clients decorate a class with this decorator to create a `Routes` module.
 *
 * Route paths are the concatenation of the basePath provided to `@Routes(basePath)`, with the
 * subpath passed to `@mapping(method, subpath)`. Route paths may incorporate complex patterns, such as:
 * - **Parameters:** `'/foo/:id'` (`:id` is captured as `ctx.params.id`, and matches any chars but `/` by default)
 * - **Multiple parameters:** `'/:foo/:bar'` (`ctx.params.foo` and `ctx.params.bar` are both available)
 * - **Mixed parameters:** `'/foo/bar-:id'` (`:id`, without `bar-`, is captured as `ctx.params.id`)
 * - **Regex parameters:** `'/foo/:id(\\d+)'`
 * - **Compound parameters:** `'/foo/:id-:name'` (`ctx.params.id` and `ctx.params.name` are both available)
 * - **Optional parameters:** `'/foo/:id{-:name}?'` (matches `/foo/12` and `/foo/12-john`)
 * - "Catch all" routes, which match their own pattern, as well as any path components beneath them. In `catchAll`
 *   mode, `/foo/:bar` matches `/foo/bar` and `/foo/bar/something/else`. This is a flag configured outside of
 *   the route pattern. See [`@mapping`](#mapping) for configuration details.
 *
 * The routing tree is constructed to ensure predictability at runtime, according to the following rules:
 * - Route components without parameters are visited first
 * - Route components with mixed parameters are visited before ones with non-mixed parameters
 * - Route components with required parameters are visited before ones with optional parameters
 * - "Catch all" routes are visited last, only if nothing else has matched a path
 * - Declaring two functionally identical routes is not permitted (i.e. `/foo/:bar` and `/foo/:car`)
 *
 * @param {string} basePath - The base path for all routes in this class. Should be unique within an application.
 * @example
 * const inject = require('ravel').inject;
 * const Routes = require('ravel').Routes;
 * const mapping = Routes.mapping;
 * const before = Routes.before;
 *
 * // you can inject your own Modules and npm dependencies into Routes
 * // &#64;Routes('/') // base path for all routes in this class
 * // &#64;inject('koa-bodyparser', 'fs', 'custom-module')
 * class MyRoutes {
 *   constructor (bodyParser, fs, custom) {
 *     this.bodyParser = bodyParser(); // make bodyParser middleware available
 *     this.fs = fs;
 *     this.custom = custom;
 *   }
 *
 *   // will map to /app
 *   // &#64;mapping(Routes.GET, 'app')
 *   // &#64;before('bodyParser') // use bodyParser middleware before handler
 *   async appHandler (ctx) {
 *     // ctx is a koa context object.
 *     // await on Promises, and set ctx.body to create a body for response
 *     // "OK" status code will be chosen automatically unless configured via ctx.status
 *     // Extend and throw a Ravel.Error to send an error status code
 *   }
 * }
 *
 * module.exports = MyRoutes;
 */
const Routes = function (basePath) {
  if (typeof basePath !== 'string') {
    throw new $err.IllegalValue(
      '@Routes must be used with a basePath, as in @Routes(\'/route/base/path\')');
  }
  // normalize and validate base path
  const bp = upath.toUnix(upath.posix.normalize(basePath));
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target.prototype, '@role', 'type', 'Routes');
    Metadata.putClassMeta(target.prototype, '@role', 'name', bp);
  };
};

/*!
 * Populates a class with a static reference to the // &#64;Routes role decorator
 */
module.exports = Routes;
