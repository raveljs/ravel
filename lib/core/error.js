'use strict';

/**
 * Allow users to define their own error types,
 * along with matching HTTP status codes
 */

var util = require('util');

module.exports = function(Ravel) {
  Ravel.error = function(name, code) {
    //guard against naming collisions
    if (Ravel.ApplicationError[name]) {
      throw new Ravel.ApplicationError.DuplicateEntry('Ravel.ApplicationError.' + name + ' already exists!');
    } else if (name === undefined || name === null || typeof name !== 'string') {
      throw new Ravel.ApplicationError.IllegalValue(
        'Name for new custom error type: \'' + name + '\' must be a string.');
    } else if (code === undefined || code === null || typeof code !== 'number' || (code < 100 || code > 505)) {
      throw new Ravel.ApplicationError.IllegalValue(
        'HTTP status code for Ravel.ApplicationError.' + name + ' must be a number between 100 and 505');
    } else {
      Ravel.ApplicationError[name] = function (msg) {
        Ravel.ApplicationError[name].super_.call(this, msg, this.constructor, code);
      };
      util.inherits(Ravel.ApplicationError[name], Ravel.ApplicationError.General);
      Ravel.ApplicationError[name].prototype.name = name;
    }
  };
};
