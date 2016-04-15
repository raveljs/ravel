'use strict';

const Metadata = require('../../util/meta');

/**
 * Decorator for setting the relative path of a method within a Route
 */
function mapping(verb, path) {
  return function(target, key, descriptor) {
    const info = {
      name: key,
      verb: verb,
      path: path,
      endpoint: descriptor.value
    };
    Metadata.putClassMeta(target, '@mapping', key, info);
    // delete target[key];
  };
}

/**
 * Populates a class with a static reference to the @before decorator
 */
module.exports = function(target) {
  target.mapping = mapping;
};
