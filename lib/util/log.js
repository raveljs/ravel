'use strict';

const intel = require('intel');
const $err = require('../util/application_error');

const sLogger = Symbol.for('_logger');

/**
 * Log levels for Ravel. View source for more information.
 *
 * @private
 */
const logLevels = {
  TRACE: intel.TRACE,
  VERBOSE: intel.VERBOSE,
  DEBUG: intel.DEBUG,
  INFO: intel.INFO,
  WARN: intel.WARN,
  ERROR: intel.ERROR,
  CRITICAL: intel.CRITICAL,
  NONE: intel.NONE,
  ALL: intel.ALL
};

/*
 * @private
 */
function prepLoggerConfig (format, colorize) {
  return {
    formatters: {
      simple: {
        format: format,
        colorize: colorize
      }
    },
    handlers: {
      terminal: {
        class: intel.handlers.Console,
        formatter: 'simple'
      }
    },
    loggers: {
      root: {
        handlers: ['terminal'],
        handleExceptions: false,
        exitOnError: false,
        propagate: false
      }
    }
  };
}

/**
 * An abstraction for a logging service which wraps around [intel](https://github.com/seanmonstar/intel).
 */
class Logger {
  constructor (source) {
    this[sLogger] = intel.getLogger(source);

    this.TRACE = 'TRACE';
    this.VERBOSE = 'VERBOSE';
    this.DEBUG = 'DEBUG';
    this.INFO = 'INFO';
    this.WARN = 'WARN';
    this.ERROR = 'ERROR';
    this.CRITICAL = 'CRITICAL';
    this.NONE = 'NONE';
    this.ALL = 'ALL';
  }

  /**
   * Log at the 'trace' level.
   */
  trace () { return this[sLogger].trace.apply(this[sLogger], arguments); }

  /**
   * Log at the 'verbose' level.
   */
  verbose () { return this[sLogger].verbose.apply(this[sLogger], arguments); }

  /**
   * Log at the 'debug' level.
   */
  debug () { return this[sLogger].debug.apply(this[sLogger], arguments); }

  /**
   * Log at the 'info' level.
   */
  info () { return this[sLogger].info.apply(this[sLogger], arguments); }

  /**
   * Log at the 'warn' level.
   */
  warn () { return this[sLogger].warn.apply(this[sLogger], arguments); }

  /**
   * Log at the 'error' level.
   */
  error () { return this[sLogger].error.apply(this[sLogger], arguments); }

  /**
   * Log at the 'critical' level.
   */
  critical () { return this[sLogger].critical.apply(this[sLogger], arguments); }
}

/**
 * A factory for `Logger`s. Used within `Module`s, `Resource`s and `Routes`.
 *
 * @private
 */
class Log extends Logger {
  constructor (ravelInstance) {
    super('ravel');

    // logging parameters
    ravelInstance.registerParameter('log level', true, this.DEBUG);
    ravelInstance.registerParameter('log format', true, '[%(date)s] %(name)s.%(levelname)s: %(message)s');
    ravelInstance.registerParameter('log colors', true, true);

    // preconfigure with fixed values, then we configure again when param system is initialized
    intel.removeAllHandlers(); // this prevents the test suite from repeatedly registering console loggers
    intel.config(prepLoggerConfig('[%(date)s] %(name)s.%(levelname)s: %(message)s', true));

    ravelInstance.once('post load parameters', () => {
      this.setLevel(ravelInstance.get('log level'));
      intel.removeAllHandlers(); // this prevents the test suite from repeatedly registering console loggers
      intel.config(prepLoggerConfig(ravelInstance.get('log format'), ravelInstance.get('log colors')));
    });
  }

  setLevel (logLevel) {
    if (logLevels[logLevel]) {
      intel.setLevel(logLevels[logLevel]);
    } else {
      throw new $err.IllegalValue(`Specified log level ${logLevel} is not supported.`);
    }
  }

  getLogger (source) {
    return new Logger(source);
  }
}

/*!
 * Export `Log` for Ravel
 */
module.exports = Log;
