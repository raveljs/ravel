'use strict';

const upath = require('upath');
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
   * Load parameters from a `.ravelrc.json` file during `init()`
   * This file must be located beside `app.js` or in any parent directory of `app.js`.
   * @memberof Ravel
   * @api private
   */
  Ravel.prototype[symbols.loadParameters] = function() {
    let fromFile = Object.create(null);
    let nextDir = this.cwd, currentDir;
    do {
      currentDir = nextDir;
      // load parameters from config file into an empty object
      // search upwards until we run out of path components or find something
      // don't require extension; node will search for .js/.json/.node
      const search = upath.join(currentDir, '.ravelrc');
      try {
        fromFile = require(search);
        if (typeof fromFile === 'string') {
          fromFile = JSON.parse(fromFile);
        }
        break;
      } catch (err) {
        this.once('post init', () => {
          this.log.trace(`Could not locate .ravelrc.json at ${search}`, err.message);
        });
        nextDir = upath.join(currentDir, '..');
      }
    } while(nextDir !== currentDir);


    // verify all parameters in fromFile are known
    for (let key of Object.keys(fromFile)) {
      if (!this[symbols.knownParameters][key]) {
        throw new this.ApplicationError.IllegalValue(
          `Attempted to set unknown parameter: ${key.toString()}`);
      }
    }

    // merge params from file into defaults, so file params take precendence over defaults
    Object.assign(defaults, fromFile);
    // now merge with this[symbols.params], allowing programmatically set params to take precedence
    Object.assign(defaults, this[symbols.params]);
    // now defaults contains what we want, so make it this[symbols.params]
    this[symbols.params] = defaults;
    // done!
    this[symbols.parametersLoaded] = true;
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
    if (!this[symbols.parametersLoaded]) {
      throw new this.ApplicationError.General('Cannot get() parameters until after app.init()');
    } else if (!this[symbols.knownParameters][key]) {
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
