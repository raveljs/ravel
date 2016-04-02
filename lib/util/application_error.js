'use strict';

const httpCodes = require('./http_codes');

/**
 * Base error type for Ravel, to be extended into semantic errors
 * which can be used within Ravel modules, as well as by clients'
 * APIs. These Error types are intended to encapsulate standard
 * things that can go wrong and, when used by a client, are
 * translated into HTTP status codes automatically in
 * **Resource** responses
 *
 * Thanks to http://dustinsenos.com/articles/customErrorsInNode
 */
class RavelError extends Error {
  constructor(msg, constr, code) {
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
 * not authorized to access due to lack of workspace membership
 *
 * @param {String} msg A string representation of this AccessError
 */
class AccessError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.FORBIDDEN);
  }
}

/**
 * Authorization Error - Most useful for creating authorization providers
 *
 * @param {String} msg A string representation of this AuthorizationError
 */
class AuthorizationError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.UNAUTHORIZED);
  }
}

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record
 * into the database which violates a uniqueness constraint
 *
 * @param {String} msg A string representation of this DuplicateEntryError
 */
class DuplicateEntryError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.CONFLICT);
  }
}

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 *
 * @param {String} msg A string representation of this IllegalValueError
 */
class IllegalValueError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.BAD_REQUEST);
  }
}

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 *
 * @param {String} msg A string representation of this NotAllowedError
 */
class NotAllowedError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.METHOD_NOT_ALLOWED);
  }
}

/**
 * Not Found Error - Thrown when something is expected to exist, but is not found.
 *
 * @param {String} msg A string representation of this NotFoundError
 */
class NotFoundError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.NOT_FOUND);
  }
}


/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
class NotImplementedError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.NOT_IMPLEMENTED);
  }
}

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
class RangeOutOfBoundsError extends RavelError {
  constructor(msg) {
    super(msg, constructor, httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
  }
}


module.exports = {
  General: RavelError,
  Access: AccessError,
  Authorization: AuthorizationError,
  DuplicateEntry: DuplicateEntryError,
  IllegalValue: IllegalValueError,
  NotAllowed: NotAllowedError,
  NotFound: NotFoundError,
  NotImplemented:NotImplementedError,
  RangeOutOfBounds:RangeOutOfBoundsError
};
