'use strict';

const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * Dependency injection decorator for Ravel `Modules`,
 * `Resources` and `Routes`.
 * Extremely similar to [@inject](#inject), but will automatmically
 * assign the injected components to values on the current scope,
 * based on name, after construction (this means that these values
 * will not be available in the construtor). Injected modules can be
 * locally renamed by supplying an alias.
 *
 * This decorator simply annotates the class with modules which
 * should be injected when Ravel initializes. See `util/injector`
 * for the actual DI implementation.
 *
 * @param {String...} rest - The names of `Module`s or npm modules to inject.
 * @example
 * // @autoinject works the same way on Modules, Resources and Routes
 * const autoinject = require('ravel').autoinject;
 * const postinject = require('ravel').postinject;
 * const Module = require('ravel').Module;
 *
 * // &#64;@Module('mymodule')
 * // &#64;autoinject('path', {'fs': 'myfs'}, 'custom-module')
 * class MyModule {
 *   constructor () {
 *     // this.myfs, this.path and this['custom-module']
 *     // are not available in the constructor, and will
 *     // will be populated after construction time.
 *     // If you set any properties on this with identical
 *     // names, they will be overriden.
 *   }
 *
 *   aMethod() {
 *     // can access this.myfs, this.path or this['custom-module']
 *   }
 *
 *   // &#64;postinject
 *   init () {
 *     // Since autoinjected modules are not present in the constructor,
 *     // @postinject-decorated methods provide an alternative way to
 *     // consume injectables for initialization immediately
 *     // after instantiation.
 *   }
 * }
 */
const autoinject = function (...rest) {
  return function (target) {
    if (rest.length === 0) {
      throw new $err.NotFound(`Empty @autoinject supplied on ${typeof target}`);
    }
    const toInject = Object.assign({}, Metadata.getClassMetaValue(target.prototype, '@autoinject', 'dependencies', {}));
    for (const elem of rest) {
      if (typeof elem === 'string') {
        toInject[elem] = elem;
      } else if (typeof elem === 'object') {
        if (Object.values(elem).filter(v => typeof v !== 'string').length > 0) {
          throw new $err.IllegalValue('Values supplied to @autoinject decorator within objects must be strings.');
        }
        Object.assign(toInject, elem);
      } else {
        throw new $err.IllegalValue('Values supplied to @autoinject decorator must be strings or objects.');
      }
    }
    Metadata.putClassMeta(target.prototype, '@autoinject', 'dependencies', toInject);
  };
};

/*!
 * Populates a class with a static reference to the // &#64;autoinject decorator
 */
module.exports = autoinject;
