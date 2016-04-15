'use strict';

const symbols = require('../symbols');

/**
 * Decorator for setting the relative path of a method within a Route
 */
function mapping(verb, path) {
  return function(target, key, descriptor) {
    if (typeof target[symbols.meta] !== 'object') {
      target[symbols.meta] = Object.create(null);
    }
    if (typeof target[symbols.meta]['@mapping'] !== 'object') {
      target[symbols.meta]['@mapping'] = Object.create(null);
    }
    target[symbols.meta]['@mapping'][key] = {
      name: key,
      verb: verb,
      path: path,
      endpoint: descriptor.value
    };
    // delete target[key];
  };
}

/**
 * Populates a class with a static reference to the @before decorator
 */
module.exports = function(target) {
  target.mapping = mapping;
};
