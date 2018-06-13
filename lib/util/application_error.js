'use strict';

const httpCodes = require('./http_codes');

/**
 * Base error type for Ravel, to be extended into semantic errors
 * which can be used within Ravel modules, as well as by clients'
 * APIs. These Error types are intended to encapsulate standard
 * things that can go wrong and, when used by a client, are
 * translated into HTTP status codes automatically in
 * `Resource` responses
 * @private
 */
class RavelError extends Error {
  /**
   * Construct a new Ravel.Error.
   *
   * @param {string} msg - A message for this error..
   * @param  {number} code - An HTTP status code between 100 and 505.
   * @private
   */
  constructor (msg, code) {
    super(msg);

    if (code !== null && code !== undefined && (typeof code !== 'number' || (code < 100 || code > 505))) {
      throw new Error(`HTTP status code ${code} for ${this.constructor.name} must be a number between 100 and 505`);
    }

    Error.captureStackTrace(this, this.constructor);
    this.message = msg || '';
    this.code = code || httpCodes.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Access Error - Thrown when a user attempts to utilize functionality they are
 * not authenticated to access
 * @private
 */
class AccessError extends RavelError {
  /**
   * Construct a new `Ravel.$err.Access`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.FORBIDDEN);
  }
}

/**
 * Authentication Error - Most useful for creating authentication providers
 * @private
 */
class AuthenticationError extends RavelError {
  /**
   * Construct a new `Ravel.$err.Authentication`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.UNAUTHORIZED);
  }
}

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record
 * into the database which violates a uniqueness constraint
 * @private
 */
class DuplicateEntryError extends RavelError {
  /**
   * Construct a new `Ravel.$err.DuplicateEntry`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.CONFLICT);
  }
}

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 * @private
 */
class IllegalValueError extends RavelError {
  /**
   * Construct a new `Ravel.$err.IllegalValue`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.BAD_REQUEST);
  }
}

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 * @private
 */
class NotAllowedError extends RavelError {
  /**
   * Construct a new `Ravel.$err.NotAllowed`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.METHOD_NOT_ALLOWED);
  }
}

/**
 * Not Found Error - Thrown when something is expected to exist, but is not found.
 * @private
 */
class NotFoundError extends RavelError {
  /**
   * Construct a new `Ravel.$err.NotFound`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.NOT_FOUND);
  }
}

/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 * @private
 */
class NotImplementedError extends RavelError {
  /**
   * Construct a new `Ravel.$err.NotImplemented`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.NOT_IMPLEMENTED);
  }
}

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 * @private
 */
class RangeOutOfBoundsError extends RavelError {
  /**
   * Construct a new `Ravel.$err.RangeOutOfBounds`.
   *
   * @param {string} msg - A message for this error.
   */
  constructor (msg) {
    super(msg, httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
  }
}

/**
 * Built-in error types for Ravel. When thrown within (or up to) a `Routes` or
 * `Resource` handler, the response to that request will automatically
 * use the associated error status code (rather than a developer needing
 * to catch their own errors and set status codes manually).
 *
 * You can create your own `Error` types associated with status codes by
 * extending `Ravel.Error`.
 */
class $err {
  /**
   * Base error type. Associated with HTTP 500 Internal Server Error.
   *
   * @returns {RavelError} - The Error class.
   * @static
   * @readonly
   */
  static get General () { return RavelError; }

  /**
   * Access Error - Throw when a user attempts to utilize functionality they are
   * not authenticated to access. Associated with HTTP 403 FORBIDDEN.
   *
   * @returns {AccessError} - The Error class.
   * @static
   * @readonly
   */
  static get Access () { return AccessError; }

  /**
   * Authentication Error - Throw when a user is not authenticated to perform
   * some action. Associated with HTTP 401 UNAUTHORIZED.
   *
   * @returns {AuthenticationError} - The Error class.
   * @static
   * @readonly
   */
  static get Authentication () { return AuthenticationError; }

  /**
   * Duplicate Entry Error - Throw when an attempt is made to insert a record
   * into the database which violates a uniqueness constraint. Associated
   * with HTTP 409 CONFLICT.
   *
   * @returns {DuplicateEntryError} - The Error class.
   * @static
   * @readonly
   */
  static get DuplicateEntry () { return DuplicateEntryError; }

  /**
   * Illegal Value Error - Throw when the user supplies an illegal value.
   * Associated with HTTP 400 BAD REQUEST.
   *
   * @returns {IllegalValueError} - The Error class.
   * @static
   * @readonly
   */
  static get IllegalValue () { return IllegalValueError; }

  /**
   * Not Allowed Error - Used to mark API functionality which is not permitted
   * to be accessed under the current application configuration. Associated
   * with HTTP 405 METHOD NOT ALLOWED.
   *
   * @returns {NotAllowedError} - The Error class.
   * @static
   * @readonly
   */
  static get NotAllowed () { return NotAllowedError; }

  /**
   * Not Found Error - Throw when something is expected to exist, but is not found.
   * Associated with HTTP 404 NOT FOUND.
   *
   * @returns {NotFoundError} - The Error class.
   * @static
   * @readonly
   */
  static get NotFound () { return NotFoundError; }

  /**
   * Not Implemented Error - Throw to mark API functionality which has not yet
   * been implemented. Associated with HTTP 501 NOT IMPLEMENTED.
   *
   * @returns {NotImplementedError} - The Error class.
   * @static
   * @readonly
   */
  static get NotImplemented () { return NotImplementedError; }

  /**
   * Range Out Of Bounds Error - Throw when a range of data is requested from a set
   * which is outside of the bounds of that set. Associated with HTTP 416 REQUESTED RANGE NOT SATISFIABLE.
   *
   * @returns {RangeOutOfBoundsError} - The Error class.
   * @static
   * @readonly
   */
  static get RangeOutOfBounds () { return RangeOutOfBoundsError; }
}

/**
 * Export Ravel built-in errors as an Object.
 * @type Object
 * @private
 */
module.exports = $err;
