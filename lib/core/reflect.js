'use strict';

const symbols = require('./symbols');
const Metadata = require('../util/meta');
const ApplicationError = require('../util/application_error');

const sRegisteredAt = Symbol('_registeredAt');

/**
 * A container class for Metadata about `Modules`,
 * `Resources` and `Routes`
 * @api private
 */
class Meta {
  /**
   * @param {String} path the file path of the target class, relative to the cwd
   * @param {Class} klass the target class
   * @api private
   */
  constructor(path, klass) {
    this.path = path;
    this.class = klass;
    this[sRegisteredAt] = Date.now();
  }

  /**
   * @return {Date} the moment this class was registered
   * @api private
   */
  get registeredAt() {
    return this[sRegisteredAt];
  }

  /**
   * @return {Object} the metadata for the target class
   * @api private
   */
  get metadata() {
    return Metadata.getMeta(this.class.prototype);
  }
}

/*!
 * Provides Ravel with a simple mechanism of reflecting
 * on known classes which have been registered as
 * modules, resources or routes.
 */
module.exports = function(Ravel) {

  /**
   * Initialize `Meta` for a known class
   * @api private
   */
  Ravel.prototype[symbols.registerClassFunc] = function(path, klass) {
    this[symbols.knownClasses][path] = new Meta(path, klass);
  };

  /**
   * Reflect on a module, resource or routes class which
   * has been registered with Ravel, using its path as
   * a key.
   * @param {String} filePath the path to the file
   * @return {Object} an object with useful reflection functions
   */
  Ravel.prototype.reflect = function(filePath) {
    if (!this[symbols.knownClasses][filePath]) {
      throw new ApplicationError.NotFound(
        `Class at ${filePath} is not registered with Ravel.`);
    } else {
      return this[symbols.knownClasses][filePath];
    }
  };
};
