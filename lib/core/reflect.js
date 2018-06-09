'use strict';

const symbols = require('./symbols');
const Metadata = require('../util/meta');
const ApplicationError = require('../util/application_error');

const sRegisteredAt = Symbol('_registeredAt');

/**
 * A container class for Metadata about `Modules`,
 * `Resources` and `Routes`.
 *
 * @private
 */
class Meta {
  /**
   * @param {string} path - The file path of the target class, relative to the cwd.
   * @param {Class} klass - The target class.
   * @private
   */
  constructor (path, klass) {
    this.path = path;
    this.class = klass;
    this[sRegisteredAt] = Date.now();
  }

  /**
   * @returns {number} The moment this class was registered (millis).
   * @private
   */
  get registeredAt () {
    return this[sRegisteredAt];
  }

  /**
   * @returns {Object} The metadata for the target class.
   * @private
   */
  get metadata () {
    return Metadata.getMeta(this.class.prototype);
  }
}

/*!
 * Provides Ravel with a simple mechanism of reflecting
 * on known classes which have been registered as
 * modules, resources or routes.
 * TODO broken since we don't require file paths anymore.
 */
module.exports = function (Ravel) {
  /**
   * Initialize `Meta` for a known class.
   * TODO broken since we don't require file paths anymore.
   *
   * @param {string} path - The file path of a class.
   * @param {Class} klass - The class prototype.
   * @private
   */
  Ravel.prototype[symbols.registerClassFunc] = function (path, klass) {
    this[symbols.knownComponents][path] = new Meta(path, klass);
  };

  /**
   * Reflect on a `Module`, `Resource` or `Routes` class which
   * has been registered with Ravel, using its path as
   * a key.
   * TODO broken since we don't require file paths anymore.
   *
   * @param {string} filePath - The path to the file.
   * @returns {Object} An object with useful reflection functions.
   * @private
   */
  Ravel.prototype.reflect = function (filePath) {
    if (!this[symbols.knownComponents][filePath]) {
      throw new ApplicationError.NotFound(
        `Class at ${filePath} is not registered with Ravel.`);
    } else {
      return this[symbols.knownComponents][filePath];
    }
  };

  /**
   * Reflect on the Ravel app, listing all known classes
   * by their file paths. This can be used in conjunction with
   * `Ravel.reflect` to retrieve metadata about all classes in
   * a Ravel application.
   * TODO broken since we don't require file paths anymore.
   *
   * @returns {Array<string>} A list of known classes' file paths.
   * @private
   */
  Ravel.prototype.knownComponents = function () {
    return Object.keys(this[symbols.knownComponents]);
  };
};
