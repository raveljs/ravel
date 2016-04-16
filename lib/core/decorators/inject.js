'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * Dependency injection decorator (es7) for Ravel Modules,
 * Resources and Routes.
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
 * should be injected when Ravel initializes. See util/injector
 * for the actual DI implementation.
 */
const inject = function(...rest) {
  return function(target) {
    if (rest.length === 0)  {
      throw new ApplicationError.NotFound(`Empty @inject supplied on ${typeof target}`);
    }
    for (let elem of rest) {
      if (typeof elem !== 'string') {
        throw new ApplicationError.IllegalValue('Values supplied to @inject decorator must be strings.');
      }
    }
    Metadata.putClassMeta(target, '@inject', 'dependencies',
      rest.concat(Metadata.getClassMetaValue(target, '@inject', 'dependencies', [])));
  };
};

/**
 * Populates a class with a static reference to the @inject decorator
 */
module.exports = function(Ravel) {
  Ravel.inject = inject;
};
