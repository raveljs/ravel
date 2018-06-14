'use strict';

const upath = require('upath');
const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * What might be referred to as a *controller* in other frameworks, a `Resource` module defines HTTP
 * methods on an endpoint, supporting the session-per-request transaction pattern via Ravel
 * middleware. `Resource`s also support dependency injection, allowing for the easy creation of RESTful
 * interfaces to your `Module`-based application logic. Resources are really just a thin
 * wrapper around `Routes`, using specially-named handler functions (`get`, `getAll`, `post`,
 * `put`, `putAll`, `delete`, `deleteAll`) instead of `@mapping`. This convention-over-configuration
 * approach makes it easier to write proper REST APIs with less code, and is recommended over
 * "carefully chosen" `@mapping`s in a `Routes` class.
 *
 * Omitting any or all of the specially-named handler functions is fine, and will result in a
 * `501 NOT IMPLEMENTED` status when that particular method/endpoint is requested.
 *
 * `Resource`s inherit all the properties, methods and decorators of `Routes`. See [`Routes`](#routes)
 * for more information. Note that `@mapping` does not apply to `Resources`.
 *
 * @param {string} basePath - The base path for all endpoints in this class. Should be unique within an application.
 * @example
 * const inject = require('ravel').inject;
 * const Resource = require('ravel').Resource;
 * const before = Resource.before;
 *
 * // you can inject your own Modules and npm dependencies into Resources
 * // &#64;Resource('/person')
 * // &#64;inject(koa-bodyparser', 'fs', 'custom-module')
 * class PersonResource {
 *   constructor (bodyParser, fs, custom) {
 *     this.bodyParser = bodyParser(); // make bodyParser middleware available
 *     this.fs = fs;
 *     this.custom = custom;
 *   }
 *
 *   // will map to GET /person
 *   // &#64;before('bodyParser') // use bodyParser middleware before handler
 *   async getAll (ctx) {
 *     // ctx is a koa context object.
 *     // await on Promises, and set ctx.body to create a body for response
 *     // "OK" status code will be chosen automatically unless configured via ctx.status
 *     // Extend and throw a Ravel.Error to send an error status code
 *   }
 *
 *   // will map to GET /person/:id
 *   async get (ctx) {
 *     // can use ctx.params.id in here automatically
 *   }
 *
 *   // will map to POST /person
 *   async post (ctx) {}
 *
 *   // will map to PUT /person
 *   async putAll (ctx) {}
 *
 *   // will map to PUT /person/:id
 *   async put (ctx) {}
 *
 *   // will map to DELETE /person
 *   async deleteAll (ctx) {}
 *
 *   // will map to DELETE /person/:id
 *   async delete (ctx) {}
 * }
 *
 * module.exports = PersonResource;
 */
const Resource = function (basePath) {
  if (typeof basePath !== 'string') {
    throw new $err.IllegalValue(
      `@Resource must be used with a basePath, as in @Resource('/route/base/path')`);
  }
  // normalize and validate base path
  const bp = upath.posix.normalize(basePath);
  return function (target, key, descriptor) {
    Metadata.putClassMeta(target.prototype, '@role', 'type', 'Resource');
    Metadata.putClassMeta(target.prototype, '@role', 'name', bp);
  };
};

/*!
 * Populates a class with a static reference to the // &#64;Resource role decorator
 */
module.exports = Resource;
