'use strict';

const upath = require('upath');
const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * Provides Ravel with a simple mechanism for registering routes, which should generally only be used
 * for serving templated pages or static content (not for building RESTful APIs, for which `Ravel.Resource`
 * is more applicable). Clients decorate a class with this decorator to create a `Routes` module.
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
      `@Routes must be used with a basePath, as in @Routes('/route/base/path')`);
  }
  // normalize and validate base path
  const bp = upath.posix.normalize(basePath);
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target.prototype, '@role', 'type', 'Routes');
    Metadata.putClassMeta(target.prototype, '@role', 'name', bp);
  };
};

/*!
 * Populates a class with a static reference to the // &#64;Routes role decorator
 */
module.exports = Routes;
