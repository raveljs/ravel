'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * &#64;inject dependency injection decorator for Ravel `Modules`,
 * `Resources` and `Routes`.
 * Based on Aurelia @inject decorator, but without the
 * es6 module format. Since eliminating relative require()s
 * has always been one of the core goals of the Ravel
 * framework, this decorator takes strings instead of
 * actual references to require()d modules. This string
 * is either the name of the module to require, or the
 * registered name of a client Ravel Module. Ravel
 * Modules override npm modules.
 *
 * This decorator simply annotates the class with modules which
 * should be injected when Ravel initializes. See [util/injector](../../util/injector.js.html)
 * for the actual DI implementation.
 *
 * @example
 * //&#64;inject works the same way on Modules, Resources and Routes
 * const inject = require('ravel').inject
 * const Module = require('ravel').Module
 *
 * &#64;inject('path', 'fs', 'custom-module')
 * class MyModule extends Module {
 *   constructor (path, fs, custom) {
 *     super()
 *     this.path = path
 *     this.fs = fs
 *     this.custom = custom
 *   }
 *
 *   aMethod() {
 *     // can access this.fs, this.path or this.custom
 *   }
 * }
 */
const inject = function (...rest) {
  return function (target) {
    if (rest.length === 0) {
      throw new ApplicationError.NotFound(`Empty @inject supplied on ${typeof target}`);
    }
    for (let elem of rest) {
      if (typeof elem !== 'string') {
        throw new ApplicationError.IllegalValue('Values supplied to @inject decorator must be strings.');
      }
    }
    Metadata.putClassMeta(target.prototype, '@inject', 'dependencies',
      rest.concat(Metadata.getClassMetaValue(target.prototype, '@inject', 'dependencies', [])));
  };
};

/*!
 * Populates a class with a static reference to the &#64;inject decorator
 */
module.exports = inject;
