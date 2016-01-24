'use strict';

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 */

module.exports = function(Ravel) {
  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.prototype.registerSimpleParameter = function(key, required) {
    this._knownParameters[key] = {
      required: required
    };
  };

  /**
   * Get a parameter
   *
   * @param {String} key the key for the parameter
   * @throws ApplicationError.NotFound if the parameter is required and not set
   * @return {? | undefined} the parameter value, or undefined if it is not required and not set
   */
  Ravel.prototype.get = function(key) {
    if (!this._knownParameters[key]) {
      throw new this.ApplicationError.NotFound('Parameter \'' + key + '\' was requested, but is unknown.');
    } else if (this._knownParameters[key].required && this._params[key] === undefined) {
      throw new this.ApplicationError.NotFound(
        'Known required parameter \'' + key + '\' was requested, but hasn\'t been defined yet.');
    } else if (this._params[key] === undefined) {
      this.Log.trace('Optional parameter \'' + key + '\' was requested, but is not defined.');
      return undefined;
    } else {
      return this._params[key];
    }
  };

  /**
   * Set a parameter
   *
   * @param {String} key the key for the parameter
   * @param {?} value the value for the parameter
   * @throws ApplicationError.IllegalValue if key refers to an unregistered parameter
   * @return {?} the parameter value
   */
  Ravel.prototype.set = function(key, value) {
    if (this._knownParameters[key]) {
      this._params[key] = value;
    } else {
      throw new this.ApplicationError.IllegalValue('Parameter \'' + key + '\' is not supported.');
    }
  };
};
