'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * A lightweight configuration system for Ravel, allowing
 * clients, as well as other parts of the application, to
 * define expected configuration parameters and get/set
 * their values
 */

 module.exports = function(Ravel, knownParameters, params) {
 	/**
   * Register a parameter
   * @param {String} key the key for the parameter
   * @param {Boolean | undefined} required true, iff the parameter is required
   */
  Ravel.registerSimpleParameter = function(key, required) {
    knownParameters[key] = {
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
  Ravel.get = function(key) {
    if (!knownParameters[key]) {
      throw new Ravel.ApplicationError.NotFound('Parameter \'' + key + '\' was requested, but is unknown.');
    } else if (knownParameters[key].required && params[key] === undefined) {
      throw new Ravel.ApplicationError.NotFound('Known required parameter \'' + key + '\' was requested, but hasn\'t been defined yet.');
    } else if (params[key] === undefined) {
      Ravel.Log.l('Optional parameter \'' + key + '\' was requested, but is not defined.');
      return undefined;
    } else {
      return params[key];
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
  Ravel.set = function(key, value) {
    if (knownParameters[key]) {
      params[key] = value;
    } else {
      throw new Ravel.ApplicationError.IllegalValue('Parameter \'' + key + '\' is not supported.');
    }
  };
 };