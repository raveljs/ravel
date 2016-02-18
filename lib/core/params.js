'use strict';

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 */

const rc = require('rc');
const symbols = require('./symbols');

module.exports = function(Ravel) {
  Ravel.prototype[symbols.loadParameters] = function() {
    // load parameters from config into an empty object
    const config = Object.create(null);
    const sources = rc('ravel', config);

    if (sources.length > 0) {
      // verify all parameters are known
      for (let key of Object.keys(config)) {
        if (!this[symbols.knownParameters][key]) {
          throw new this.ApplicationError.IllegalValue(`Attempted to set unknown parameter: ${key} (in ${sources})`);
        }
      }

      // now merge w ith this[symbols.params], allowing this[symbols.params] to take precedence
      Object.assign(config, this[symbols.params]);
      this[symbols.params] = config;
    }
  };

  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.prototype.registerSimpleParameter = function(key, required) {
    this[symbols.knownParameters][key] = {
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
    if (!this[symbols.knownParameters][key]) {
      throw new this.ApplicationError.NotFound(`Parameter ${key} was requested, but is unknown.`);
    } else if (this[symbols.knownParameters][key].required && this[symbols.params][key] === undefined) {
      throw new this.ApplicationError.NotFound(
        `Known required parameter ${key} was requested, but hasn't been defined yet.`);
    } else if (this[symbols.params][key] === undefined) {
      this.Log.trace(`Optional parameter ${key} was requested, but is not defined.`);
      return undefined;
    } else {
      return this[symbols.params][key];
    }
  };

  /**
   * Ravel.config getter
   * @return {Object} full Ravel configuration
   */
  Object.defineProperty(Ravel.prototype, 'config', {
    get: function () { return this[symbols.params]; }
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
    if (this[symbols.knownParameters][key]) {
      this[symbols.params][key] = value;
    } else {
      throw new this.ApplicationError.IllegalValue(`Attempted to set unknown parameter: ${key}.`);
    }
  };
};
