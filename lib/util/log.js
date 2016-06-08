'use strict';

const intel = require('intel');
const ApplicationError = require('../util/application_error');

const sLogger = Symbol.for('_logger');

/**
 * Log levels for Ravel. View source for more information.
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
  ALL: intel.ALL,
};

/**
 * An abstraction for a logging service which behaves like intel
 */
class Logger {
  constructor(source) {
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
   * trace
   */
  trace() {this[sLogger].trace.apply(this[sLogger], arguments);}

  /**
   * verbose
   */
  verbose() {this[sLogger].verbose.apply(this[sLogger], arguments);}

  /**
   * debug
   */
  debug() {this[sLogger].debug.apply(this[sLogger], arguments);}

  /**
   * info
   */
  info() {this[sLogger].info.apply(this[sLogger], arguments);}

  /**
   * warn
   */
  warn() {this[sLogger].warn.apply(this[sLogger], arguments);}

  /**
   * error
   */
  error() {this[sLogger].error.apply(this[sLogger], arguments);}

  /**
   * critical
   */
  critical() {this[sLogger].critical.apply(this[sLogger], arguments);}
}

/**
 * A factory for `Logger`s. Used within `Module`s, `Resource`s and `Routes`
 * @api private
 */
class Log extends Logger {

  constructor(ravelInstance) {
    super('ravel');

    ravelInstance.registerParameter('log level', true);
    ravelInstance.set('log level', this.DEBUG); //default log level

    ravelInstance.once('pre init', function() {
      intel.setLevel(logLevels[ravelInstance.get('log level')]);
    });
  }

  setLevel(logLevel) {
    if (logLevels[logLevel]) {
      intel.setLevel(logLevels[logLevel]);
    } else {
      throw new ApplicationError.IllegalValue('Specified log level ' + logLevel + ' is not supported.');
    }
  }

  getLogger(source) {
    return new Logger(source);
  }
}

/*!
 * Export `Log` for Ravel
 */
module.exports = Log;
