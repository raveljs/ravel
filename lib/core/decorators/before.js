'use strict';

const ApplicationError = require('../../util/application_error');
const symbols = require('../../util/symbols');

/**
 * Decorator for adding middleware before an endpoint.
 *
 * Decorating a handler with @before in a Resource allows
 * the client to register middleware which should run
 * before that handler. Decorating a Resource class itself
 * with @before registers middleware which should run
 * before each of its handlers.
 */
function before(...rest) {
  for (let r of rest) {
    if (typeof r !== 'string') {
      throw new ApplicationError.IllegalValue('Values supplied to @before decorator must be strings.');
    }
  }

  return function(target, key) {
    //TODO ensure that this is only used on Resources and Routes
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

/**
 * Populates a class with a static reference to the @before decorator
 */
module.exports = function(target) {
  target.before = before;
};
