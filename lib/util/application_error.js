'use strict';

/**
 * Error types for Ravel, to be used within Ravel modules,
 * as well as by clients' APIs. These Error types are intended
 * to encapsulate standard things that can go wrong and, when
 * used by a client, are translated into HTTP status codes
 * automatically in resource responses
 *
 * Thanks to http://dustinsenos.com/articles/customErrorsInNode
 */

const httpCodes = require('./http_codes');

class AbstractError extends Error {
  constructor(msg, constr, code) {
    super(msg);
    Error.captureStackTrace(this, constr || this);
    this.message = msg || '';
    this.code = code || httpCodes.INTERNAL_SERVER_ERROR;
  }
}
AbstractError.prototype.name = 'AbstractError';

/**
 * Access Error - Thrown when a user attempts to utilize functionality they are
 * not authorized to access due to lack of workspace membership
 *
 * @param {String} msg A string representation of this AccessError
 */
class AccessError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.FORBIDDEN);
  }
}
AccessError.prototype.name = 'AccessError';

/**
 * Authorization Error - Most useful for creating authorization providers
 *
 * @param {String} msg A string representation of this AuthorizationError
 */
class AuthorizationError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.UNAUTHORIZED);
  }
}
AuthorizationError.prototype.name = 'AuthorizationError';

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record
 * into the database which violates a uniqueness constraint
 *
 * @param {String} msg A string representation of this DuplicateEntryError
 */
class DuplicateEntryError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.CONFLICT);
  }
}
DuplicateEntryError.prototype.name = 'DuplicateEntryError';

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 *
 * @param {String} msg A string representation of this IllegalValueError
 */
class IllegalValueError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.BAD_REQUEST);
  }
}
IllegalValueError.prototype.name = 'IllegalValueError';

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 *
 * @param {String} msg A string representation of this NotAllowedError
 */
class NotAllowedError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.METHOD_NOT_ALLOWED);
  }
}
NotAllowedError.prototype.name = 'NotAllowedError';

/**
 * Not Found Error - Thrown when a record is expected to exist in the ravel
 * database, but is not found.
 *
 * @param {String} msg A string representation of this NotFoundError
 */
class NotFoundError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.NOT_FOUND);
  }
}
NotFoundError.prototype.name = 'NotFoundError';


/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
class NotImplementedError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.NOT_IMPLEMENTED);
  }
}
NotImplementedError.prototype.name = 'NotImplementedError';

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
class RangeOutOfBoundsError extends AbstractError {
  constructor(msg) {
    super(msg, constructor, httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
  }
}
RangeOutOfBoundsError.prototype.name = 'RangeOutOfBoundsError';


module.exports = {
  General: AbstractError,
  Access: AccessError,
  Authorization: AuthorizationError,
  DuplicateEntry: DuplicateEntryError,
  IllegalValue: IllegalValueError,
  NotAllowed: NotAllowedError,
  NotFound: NotFoundError,
  NotImplemented:NotImplementedError,
  RangeOutOfBounds:RangeOutOfBoundsError
};
