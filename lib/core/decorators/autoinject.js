'use strict';

const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * Dependency injection decorator for Ravel `Modules`,
 * `Resources` and `Routes`.
 * Extremely similar to [@inject](#inject), but will automatmically
 * assign the injected components to values on the current scope,
 * based on name, after construction. This means that these values
 * will not be available in the construtor.
 *
 * This decorator simply annotates the class with modules which
 * should be injected when Ravel initializes. See `util/injector`
 * for the actual DI implementation.
 *
 * @param {String...} rest - The names of `Module`s or npm modules to inject.
 * @example
 * // @autoinject works the same way on Modules, Resources and Routes
 * const autoinject = require('ravel').autoinject;
 * const Module = require('ravel').Module;
 *
 * // &#64;@Module('mymodule')
 * // &#64;autoinject('path', 'fs', 'custom-module')
 * class MyModule {
 *   constructor() {
 *     // this.fs, this.path and this['custom-module']
 *     // are not available in the constructor, and will
 *     // will be populated after construction time.
 *     // If you set any properties on this with identical
 *     // names, they will be overriden.
 *   }
 *
 *   aMethod() {
 *     // can access this.fs, this.path or this['custom-module']
 *   }
 * }
 */
const autoinject = function (...rest) {
  return function (target) {
    if (rest.length === 0) {
      throw new $err.NotFound(`Empty @autoinject supplied on ${typeof target}`);
    }
    for (const elem of rest) {
      if (typeof elem !== 'string') {
        throw new $err.IllegalValue('Values supplied to @inject decorator must be strings.');
      }
    }
    Metadata.putClassMeta(target.prototype, '@autoinject', 'dependencies',
      rest.concat(Metadata.getClassMetaValue(target.prototype, '@autoinject', 'dependencies', [])));
  };
};

/*!
 * Populates a class with a static reference to the // &#64;autoinject decorator
 */
module.exports = autoinject;
