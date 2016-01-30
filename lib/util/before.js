'use strict';

const ApplicationError = require('./application_error');

/**
 * Decorator for adding middleware before an endpoint
 */
function before(...rest) {
  //TODO ensure that this is only used on Resources and Routes
  for (let r of rest) {
    if (typeof r !== 'string') {
      throw new ApplicationError.IllegalValue('Values supplied to @pre decorator must be strings.');
    }
  }

  return function(target, key) {
    if (rest.length === 0)  {
      throw new ApplicationError.NotFound(`Empty @pre supplied on method ${key} of Resource ${typeof target}`);
    } else if (key === undefined) {
      // when applied to a class
      target.prototype._globalMiddleware = rest;
    } else {
      // when applied to a method
      target[`_middleware_${key}`] = rest; //store middleware in class as a static property
    }
  };
};

module.exports = function(Ravel) {
  //add in @before decorator as static property
  Ravel.before = before;
};
