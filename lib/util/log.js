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

var ravelLogger = intel.getLogger('ravel');

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
      if (logLevels[logLevel]) {
        intel.setLevel(logLevels[logLevel]);
      } else {
        throw new Ravel.ApplicationError.IllegalValue('Specified log level ' + logLevel + ' is not supported.');
      }
    },
    getLogger: function(source) {
      var logger = intel.getLogger(source);

      return {
          trace: function() {logger.trace.apply(logger.trace, arguments);},
          verbose: function() {logger.verbose.apply(logger.verbose, arguments);},
          debug: function() {logger.debug.apply(logger.debug, arguments);},
          info: function() {logger.info.apply(logger.info, arguments);},
          warn: function() {logger.warn.apply(logger.warn, arguments);},
          error: function() {logger.error.apply(logger.error, arguments);},
          critical: function() {logger.critical.apply(logger.critical, arguments);}
      };
    },
    trace: function() {ravelLogger.trace.apply(ravelLogger.trace, arguments);},
    verbose: function() {ravelLogger.verbose.apply(ravelLogger.verbose, arguments);},
    debug: function() {ravelLogger.debug.apply(ravelLogger.debug, arguments);},
    info: function() {ravelLogger.info.apply(ravelLogger.info, arguments);},
    warn: function() {ravelLogger.warn.apply(ravelLogger.warn, arguments);},
    error: function() {ravelLogger.error.apply(ravelLogger.error, arguments);},
    critical: function() {ravelLogger.critical.apply(ravelLogger.critical, arguments);}
  };

  Ravel.registerSimpleParameter('log level', true);
  Ravel.set('log level', Ravel.Log.DEBUG); //default log level

  Ravel.once('start', function() {
    intel.setLevel(logLevels[Ravel.get('log level')]);
  });
};
