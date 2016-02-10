'use strict';

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 */

const rc = require('rc');

module.exports = function(Ravel, sParams, sKnownParameters) {
  Ravel.prototype._loadParameters = function() {
    // load parameters from config into an empty object
    const config = Object.create(null);
    const sources = rc('ravel', config);

    if (sources.length > 0) {
      // verify all parameters are known
      for (let key of Object.keys(config)) {
        if (!this[sKnownParameters][key]) {
          throw new this.ApplicationError.IllegalValue(`Attempted to set unknown parameter: ${key} (in ${sources})`);
        }
      }

      // now merge w ith this[sParams], allowing this[sParams] to take precedence
      Object.assign(config, this[sParams]);
      this[sParams] = config;
    }
  };

  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.prototype.registerSimpleParameter = function(key, required) {
    this[sKnownParameters][key] = {
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
    if (!this[sKnownParameters][key]) {
      throw new this.ApplicationError.NotFound(`Parameter ${key} was requested, but is unknown.`);
    } else if (this[sKnownParameters][key].required && this[sParams][key] === undefined) {
      throw new this.ApplicationError.NotFound(
        `Known required parameter ${key} was requested, but hasn't been defined yet.`);
    } else if (this[sParams][key] === undefined) {
      this.Log.trace(`Optional parameter ${key} was requested, but is not defined.`);
      return undefined;
    } else {
      return this[sParams][key];
    }
  };

  /**
   * Ravel.config getter
   * @return {Object} full Ravel configuration
   */
  Object.defineProperty(Ravel.prototype, 'config', {
    get: function () { return this[sParams]; }
  });

  /**
   * Set a parameter
   *
   * @param {String} key the key for the parameter
   * @param {?} value the value for the parameter
   * @throws ApplicationError.IllegalValue if key refers to an unregistered parameter
   * @return {?} the parameter value
   */
  Ravel.prototype.set = function(key, value) {
    if (this[sKnownParameters][key]) {
      this[sParams][key] = value;
    } else {
      throw new this.ApplicationError.IllegalValue(`Attempted to set unknown parameter: ${key}.`);
    }
  };
};
