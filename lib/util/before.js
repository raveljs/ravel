'use strict';

const ApplicationError = require('./application_error');
const symbols = require('./symbols');

/**
 * Decorator for adding middleware before an endpoint
 */
function before(...rest) {
  //TODO ensure that this is only used on Resources and Routes
  for (let r of rest) {
    if (typeof r !== 'string') {
      throw new ApplicationError.IllegalValue('Values supplied to @before decorator must be strings.');
    }
  }

  return function(target, key) {
    if (rest.length === 0)  {
      throw new ApplicationError.NotFound(`Empty @before supplied on method ${key} of Resource ${typeof target}`);
    } else if (key === undefined) {
      // when applied to a class
      target.prototype[symbols.beforeGlobalMiddleware] = rest;
    } else {
      // when applied to a method
      if (!target[symbols.beforeMethodMiddleware]) {
        target[symbols.beforeMethodMiddleware] = Object.create(null);
      }
      target[symbols.beforeMethodMiddleware][key] = rest; //store middleware in class as a static property
    }
  };
};

module.exports = function(target) {
  //add in @before decorator as static property to a class
  target.before = before;
};
