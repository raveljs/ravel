'use strict';

const upath = require('upath');
const symbols = require('./symbols');

/**
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values.
 *
 * @param {Class} Ravel - The Ravel prototype.
 * @private
 */
module.exports = function (Ravel) {
  /**
   * Stores default configuration values, specified at parameter creation-time
   * @private
   */
  const defaults = Object.create(null);

  const ENVVAR_PATTERN = /\$([a-zA-Z_][0-9a-zA-Z_]*)/g;

  /**
   * Interpolates config values with the values of the environment variables of the process.
   *
   * @private
   * @param {any} value - The value specified for a parameter; possibly an environment variable.
   */
  const interpolateEnvironmentVariables = function (value) {
    const IllegalValue = this.$err.IllegalValue;
    if (typeof value !== 'string') {
      return value;
    }
    const result = value.replace(ENVVAR_PATTERN, function () {
      const varname = arguments[1];
      if (process.env[varname] === undefined) {
        throw new IllegalValue(`Environment variable ${varname} was referenced but not set`);
      }
      return process.env[varname];
    });

    return result;
  };

  /**
   * Load parameters from a `.ravelrc.json` file during `init()`.
   * This file must be located beside `app.js` or in any parent directory of `app.js`.
   *
   * @private
   */
  Ravel.prototype[symbols.loadParameters] = function () {
    let fromFile = Object.create(null);
    let nextDir = this.cwd;
    let currentDir;

    do {
      currentDir = nextDir;
      // load parameters from config file into an empty object
      // search upwards until we run out of path components or find something
      // don't require extension; node will search for .js/.json/.node
      const search = upath.toUnix(upath.posix.join(currentDir, '.ravelrc'));
      try {
        fromFile = require(search);
        if (typeof fromFile === 'string') {
          fromFile = JSON.parse(fromFile);
        }
        break;
      } catch (err) {
        if (err.constructor.name === 'SyntaxError') {
          throw err;
        } else {
          this.once('post init', () => {
            this.$log.trace(`Could not locate .ravelrc.json at ${search}`, err.message);
          });
          nextDir = upath.join(currentDir, '..');
        }
      }
    } while (nextDir !== currentDir);

    // verify all parameters in fromFile are known
    for (const key of Object.keys(fromFile)) {
      if (!this[symbols.knownParameters][key]) {
        throw new this.$err.IllegalValue(
          `Attempted to set unknown parameter: ${key.toString()}`);
      }
    }

    for (const key of Object.keys(fromFile)) {
      fromFile[key] = interpolateEnvironmentVariables.bind(this)(fromFile[key]);
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
   * Validate that all defined required parameters have been set.
   *
   * @throws {NotFoundError} if any defined required parameters have not been set
   * @private
   */
  Ravel.prototype[symbols.validateParameters] = function () {
    const unknowns = Object.keys(this[symbols.knownParameters])
      .filter(p => this[symbols.knownParameters][p].required)
      .filter(p => {
        try {
          this.get(p);
          return false;
        } catch (err) {
          if (!(err instanceof this.$err.NotFound)) throw err;
          return true;
        }
      });
    if (unknowns.length > 0) {
      throw new this.$err.NotFound(
        `Required parameters have not been defined yet:\n${unknowns.join('\n')}`);
    }
  };

  /**
   * Register an application parameter.
   *
   * @param {string} key - The key for the parameter.
   * @param {boolean} required - True, iff the parameter is required. false otherwise.
   * @param {(any | undefined)} defaultValue - The default value for the parameter.
   */
  Ravel.prototype.registerParameter = function (key, required, defaultValue) {
    this[symbols.knownParameters][key] = {
      required: required
    };
    if (defaultValue !== undefined) {
      defaults[key] = JSON.parse(JSON.stringify(defaultValue));
    }
  };

  /**
   * Set the value of an application parameter.
   *
   * @param {string} key - The key for the parameter.
   * @param {Any} value - The value for the parameter.
   * @throws {IllegalValueError} if key refers to an unregistered parameter.
   * @returns {any} The parameter value.
   */
  Ravel.prototype.set = function (key, value) {
    if (this[symbols.knownParameters][key]) {
      this[symbols.params][key] = value;
    } else {
      throw new this.$err.IllegalValue(`Attempted to set unknown parameter: ${key}.`);
    }
  };

  /**
   * Get the value of an application parameter.
   *
   * @param {string} key - The key for the parameter.
   * @throws {NotFoundError} If the parameter is required and not set.
   * @returns {any} The parameter value, or undefined if it is not required and not set.
   */
  Ravel.prototype.get = function (key) {
    if (!this[symbols.parametersLoaded]) {
      throw new this.$err.General('Cannot get() parameters until after app.init()');
    } else if (!this[symbols.knownParameters][key]) {
      throw new this.$err.NotFound(`Parameter ${key} was requested, but is unknown.`);
    } else if (this[symbols.knownParameters][key].required && this[symbols.params][key] === undefined) {
      throw new this.$err.NotFound(
        `Known required parameter ${key} was requested, but hasn't been defined yet.`);
    } else if (this[symbols.params][key] === undefined) {
      this.$log.trace(`Optional parameter ${key} was requested, but is not defined.`);
      return undefined;
    } else {
      return JSON.parse(JSON.stringify(this[symbols.params][key]));
    }
  };

  /**
   * Getter for the Ravel app configuration object. This is only available after `app.init()`.
   *
   * @memberof Ravel
   * @name config
   * @returns {Object} The Ravel app configuration object (read-only).
   */
  Object.defineProperty(Ravel.prototype, 'config', {
    get: function () { return JSON.parse(JSON.stringify(this[symbols.params])); }
  });
};
