'use strict';

/**
 * Dependency injection decorator (es7) for Ravel modules
 * Based on Aurelia @inject decorator
 */

const ApplicationError = require('./application_error');

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
    if (target.inject === undefined) {
      target.inject = rest;
    } else if (target.inject !== undefined && Array.isArray(target.inject)) {
      target.inject = rest.concat(target.inject);
    } else {
      throw new ApplicationError.IllegalValue(`Cannot @inject into class ${typeof target}.
        Static inject parameter is already present, and is not an array.`);
    }
  };
};

module.exports = function(Ravel) {
  //add in @inject decorator as static property
  Ravel.inject = inject;
};
