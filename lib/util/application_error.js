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

var util = require('util');
var httpCodes = require('./http_codes');

var AbstractError = function (msg, constr, code) {
  Error.captureStackTrace(this, constr || this);
  this.message = msg || '';
  this.code = code || httpCodes.INTERNAL_SERVER_ERROR;
};
util.inherits(AbstractError, Error);
AbstractError.prototype.name = 'AbstractError';

/**
 * Access Error - Thrown when a user attempts to utilize functionality they are
 * not authorized to access due to lack of workspace membership
 *
 * @param {String} msg A string representation of this AccessError
 */
var AccessError = function (msg) {
  AccessError.super_.call(this, msg, this.constructor, httpCodes.FORBIDDEN);
};
util.inherits(AccessError, AbstractError);
AccessError.prototype.name = 'AccessError';

/**
 * Authorization Error - Most useful for creating authorization providers
 *
 * @param {String} msg A string representation of this AuthorizationError
 */
var AuthorizationError = function (msg) {
  AuthorizationError.super_.call(this, msg, this.constructor, httpCodes.UNAUTHORIZED);
};
util.inherits(AuthorizationError, AbstractError);
AuthorizationError.prototype.name = 'AuthorizationError';

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record
 * into the database which violates a uniqueness constraint
 *
 * @param {String} msg A string representation of this DuplicateEntryError
 */
var DuplicateEntryError = function (msg) {
  DuplicateEntryError.super_.call(this, msg, this.constructor, httpCodes.CONFLICT);
};
util.inherits(DuplicateEntryError, AbstractError);
DuplicateEntryError.prototype.name = 'DuplicateEntryError';

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 *
 * @param {String} msg A string representation of this IllegalValueError
 */
var IllegalValueError = function (msg) {
  IllegalValueError.super_.call(this, msg, this.constructor, httpCodes.BAD_REQUEST);
};
util.inherits(IllegalValueError, AbstractError);
IllegalValueError.prototype.name = 'IllegalValueError';

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 *
 * @param {String} msg A string representation of this NotAllowedError
 */
var NotAllowedError = function (msg) {
  NotAllowedError.super_.call(this, msg, this.constructor, httpCodes.METHOD_NOT_ALLOWED);
};
util.inherits(NotAllowedError, AbstractError);
NotAllowedError.prototype.name = 'NotAllowedError';

/**
 * Not Found Error - Thrown when a record is expected to exist in the ravel
 * database, but is not found.
 *
 * @param {String} msg A string representation of this NotFoundError
 */
var NotFoundError = function (msg) {
  NotFoundError.super_.call(this, msg, this.constructor, httpCodes.NOT_FOUND);
};
util.inherits(NotFoundError, AbstractError);
NotFoundError.prototype.name = 'NotFoundError';


/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
var NotImplementedError = function (msg) {
  NotImplementedError.super_.call(this, msg, this.constructor, httpCodes.NOT_IMPLEMENTED);
};
util.inherits(NotImplementedError, AbstractError);
NotImplementedError.prototype.name = 'NotImplementedError';

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
var RangeOutOfBoundsError = function (msg) {
  RangeOutOfBoundsError.super_.call(this, msg, this.constructor, httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
};
util.inherits(RangeOutOfBoundsError, AbstractError);
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
