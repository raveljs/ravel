'use strict';

/**
 * Allow users to define their own error types,
 * along with matching HTTP status codes
 */
module.exports = function(Ravel) {
  Ravel.prototype.error = function(name, code) {
    //guard against naming collisions
    if (this.ApplicationError[name]) {
      throw new this.ApplicationError.DuplicateEntry('Ravel.ApplicationError.' + name + ' already exists!');
    } else if (name === undefined || name === null || typeof name !== 'string') {
      throw new this.ApplicationError.IllegalValue(
        'Name for new custom error type: \'' + name + '\' must be a string.');
    } else if (code === undefined || code === null || typeof code !== 'number' || (code < 100 || code > 505)) {
      throw new this.ApplicationError.IllegalValue(
        'HTTP status code for Ravel.ApplicationError.' + name + ' must be a number between 100 and 505');
    } else {
      this.ApplicationError[name] = class extends this.ApplicationError.General {
        constructor(msg) {
          super(msg, constructor, code);
        }
      };
      this.ApplicationError[name].prototype.name = name;
    }
  };
};
