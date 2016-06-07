'use strict';

const rc = require('rc');
const symbols = require('./symbols');

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 */
module.exports = function(Ravel) {

  /**
   * Stores default configuration values, specified at parameter creation-time
   */
  const defaults = Object.create(null);

  /**
   * Private function
   * Load paramters from a .ravelrc file.
   */
  Ravel.prototype[symbols.loadParameters] = function() {
    // load parameters from config into an empty object
    const sources = rc('ravel', defaults);

    if (sources.configs && sources.configs.length > 0) {
      delete sources.configs;
      delete sources.config;
      delete sources._;
      // verify all parameters are known
      for (let key of Object.keys(defaults)) {
        if (!this[symbols.knownParameters][key]) {
          throw new this.ApplicationError.IllegalValue(
            `Attempted to set unknown parameter: ${key.toString()}`);
        }
      }

      // now merge with this[symbols.params], allowing programmatically set params to take precedence
      Object.assign(defaults, this[symbols.params]);
      this[symbols.params] = defaults;
    }
  };

  /**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean} required true, iff the parameter is required. false otherwise.
   * @param {(Any | undefined)} defaultValue the default value for the parameter
   */
  Ravel.prototype.registerParameter = function(key, required, defaultValue) {
    this[symbols.knownParameters][key] = {
      required: required
    };
    if (defaultValue !== undefined) {
      defaults[key] = defaultValue;
    }
  };

  /**
   * Set a parameter
   *
   * @param {String} key the key for the parameter
   * @param {Object} value the value for the parameter
   * @throws ApplicationError.IllegalValue if key refers to an unregistered parameter
   * @return {Object} the parameter value
   */
  Ravel.prototype.set = function(key, value) {
    if (this[symbols.knownParameters][key]) {
      this[symbols.params][key] = value;
    } else {
      throw new this.ApplicationError.IllegalValue(`Attempted to set unknown parameter: ${key}.`);
    }
  };

  /**
   * Get a parameter
   *
   * @param {String} key the key for the parameter
   * @throws ApplicationError.NotFound if the parameter is required and not set
   * @return {Object} the parameter value, or undefined if it is not required and not set
   */
  Ravel.prototype.get = function(key) {
    if (!this[symbols.knownParameters][key]) {
      throw new this.ApplicationError.NotFound(`Parameter ${key} was requested, but is unknown.`);
    } else if (this[symbols.knownParameters][key].required && this[symbols.params][key] === undefined) {
      throw new this.ApplicationError.NotFound(
        `Known required parameter ${key} was requested, but hasn't been defined yet.`);
    } else if (this[symbols.params][key] === undefined) {
      this.log.trace(`Optional parameter ${key} was requested, but is not defined.`);
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
};
