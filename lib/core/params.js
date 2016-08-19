'use strict';

const rc = require('rc');
const symbols = require('./symbols');

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 * @external Ravel
 */
module.exports = function(Ravel) {

  /**
   * Stores default configuration values, specified at parameter creation-time
   * @api private
   */
  const defaults = Object.create(null);

  /**
   * Load parameters from a `.ravelrc` file during `init()`
   * @memberof Ravel
   * @api private
   */
  Ravel.prototype[symbols.loadParameters] = function() {
    // load parameters from config into an empty object
    const fromRc = Object.create(null);
    const sources = rc('ravel', fromRc);

    // if there is a .ravelrc file, verify all parameters are known
    if (sources.configs && sources.configs.length > 0) {
      delete sources.configs;
      delete sources.config;
      delete sources._;
      // verify all parameters are known
      for (let key of Object.keys(fromRc)) {
        if (!this[symbols.knownParameters][key]) {
          throw new this.ApplicationError.IllegalValue(
            `Attempted to set unknown parameter: ${key.toString()}`);
        }
      }
    }
    // merge rc params into defaults, so rc takes precendence over defaults
    Object.assign(defaults, fromRc);
    // now merge with this[symbols.params], allowing programmatically set params to take precedence
    Object.assign(defaults, this[symbols.params]);
    // now defaults contains what we want, so make it this[symbols.params]
    this[symbols.params] = defaults;
  };

  /**
   * Register a parameter
   *
   * @memberof Ravel
   * @param {String} key the key for the parameter
   * @param {Boolean} required true, iff the parameter is required. false otherwise.
   * @param {(Any | undefined)} defaultValue the default value for the parameter
   */
  Ravel.prototype.registerParameter = function(key, required, defaultValue) {
    this[symbols.knownParameters][key] = {
      required: required
    };
    if (defaultValue !== undefined) {
      defaults[key] = JSON.parse(JSON.stringify(defaultValue));
    }
  };

  /**
   * Set a parameter
   *
   * @memberof Ravel
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
      return JSON.parse(JSON.stringify(this[symbols.params][key]));
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
