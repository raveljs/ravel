'use strict';

const httpCodes = require('./http_codes');

/**
 * Base error type for Ravel, to be extended into semantic errors
 * which can be used within Ravel modules, as well as by clients'
 * APIs. These Error types are intended to encapsulate standard
 * things that can go wrong and, when used by a client, are
 * translated into HTTP status codes automatically in
 * `Resource` responses
 *
 * Thanks to http://dustinsenos.com/articles/customErrorsInNode
 */
class RavelError extends Error {
  /**
   * Construct a new Ravel.Error
   *
   * @param  {String} msg  a message for this error
   * @param  {Number} code an HTTP status code between 100 and 505.
   */
  constructor(msg, code) {
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
 * not authenticated to access due to lack of workspace membership
 */
class AccessError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.Access`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.FORBIDDEN);
  }
}

/**
 * Authentication Error - Most useful for creating authentication providers
 */
class AuthenticationError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.Authentication`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.UNAUTHORIZED);
  }
}

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record
 * into the database which violates a uniqueness constraint
 */
class DuplicateEntryError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.DuplicateEntry`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.CONFLICT);
  }
}

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 */
class IllegalValueError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.IllegalValue`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.BAD_REQUEST);
  }
}

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 */
class NotAllowedError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.NotAllowed`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.METHOD_NOT_ALLOWED);
  }
}

/**
 * Not Found Error - Thrown when something is expected to exist, but is not found.
 */
class NotFoundError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.NotFound`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.NOT_FOUND);
  }
}


/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 */
class NotImplementedError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.NotImplemented`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.NOT_IMPLEMENTED);
  }
}

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 */
class RangeOutOfBoundsError extends RavelError {
  /**
   * Construct a new `Ravel.ApplicationError.RangeOutOfBounds`
   *
   * @param  {String} msg  a message for this error
   */
  constructor(msg) {
    super(msg, httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
  }
}

/**
 * Export Ravel built-in errors as an Object.
 * @type {Object}
 */
module.exports = {
  General: RavelError,
  Access: AccessError,
  Authentication: AuthenticationError,
  DuplicateEntry: DuplicateEntryError,
  IllegalValue: IllegalValueError,
  NotAllowed: NotAllowedError,
  NotFound: NotFoundError,
  NotImplemented:NotImplementedError,
  RangeOutOfBounds:RangeOutOfBoundsError
};
