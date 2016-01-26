'use strict';

/**
 * An abstraction for a logging service which behaves like intel
 */

const intel = require('intel');
const ApplicationError = require('../util/application_error');

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

class Logger {
  constructor(source) {
    this._logger = intel.getLogger(source);

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

  trace() {this._logger.trace.apply(this._logger, arguments);}
  verbose() {this._logger.verbose.apply(this._logger, arguments);}
  debug() {this._logger.debug.apply(this._logger, arguments);}
  info() {this._logger.info.apply(this._logger, arguments);}
  warn() {this._logger.warn.apply(this._logger, arguments);}
  error() {this._logger.error.apply(this._logger, arguments);}
  critical() {this._logger.critical.apply(this._logger, arguments);}
}

class Log extends Logger {
  constructor(ravelInstance) {
    super('ravel');

    ravelInstance.registerSimpleParameter('log level', true);
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

module.exports = Log;
