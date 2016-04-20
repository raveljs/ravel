'use strict';

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

const sLogger = Symbol.for('_logger');

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

  trace() {this[sLogger].trace.apply(this[sLogger], arguments);}
  verbose() {this[sLogger].verbose.apply(this[sLogger], arguments);}
  debug() {this[sLogger].debug.apply(this[sLogger], arguments);}
  info() {this[sLogger].info.apply(this[sLogger], arguments);}
  warn() {this[sLogger].warn.apply(this[sLogger], arguments);}
  error() {this[sLogger].error.apply(this[sLogger], arguments);}
  critical() {this[sLogger].critical.apply(this[sLogger], arguments);}
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
