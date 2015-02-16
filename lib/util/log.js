'use strict';

/**
 * An abstraction for a logging service which behaves like intel
 */

var intel = require('intel');

var logLevels = {
  TRACE: intel.TRACE,
  VERBOSE: intel.VERBOSE,
  DEBUG: intel.DEBUG,
  INFO: intel.INFO,
  WARN: intel.WARN,
  ERROR: intel.ERROR,
  CRITICAL: intel.CRITICAL,
  NONE: intel.NONE,
  ALL: intel.ALL,
};

module.exports = function(Ravel) {
  Ravel.Log = {
    TRACE: 'TRACE',
    VERBOSE: 'VERBOSE',
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
    NONE: 'NONE',
    ALL: 'ALL',
    setLevel: function(logLevel) {
      intel.setLevel(logLevels[logLevel]);
    },
    getLogger: function(source) {
      var logger = intel.getLogger(source);

      return {
          trace: function() {logger.trace(arguments);},
          verbose: function() {logger.verbose(arguments);},
          debug: function() {logger.debug(arguments);},
          info: function() {logger.info(arguments);},
          warn: function() {logger.warn(arguments);},
          error: function() {logger.error(arguments);},
          critical: function() {logger.critical(arguments);}
      };
    },
    trace: function() {intel.trace(arguments);},
    verbose: function() {intel.verbose(arguments);},
    debug: function() {intel.debug(arguments);},
    info: function() {intel.info(arguments);},
    warn: function() {intel.warn(arguments);},
    error: function() {intel.error(arguments);},
    critical: function() {intel.critical(arguments);}
  };

  Ravel.registerSimpleParameter('log level', true);
  Ravel.set('log level', Ravel.Log.DEBUG); //default log level

  Ravel.once('start', function() {
    intel.setLevel(logLevels[Ravel.get('log level')]);
  });
};
