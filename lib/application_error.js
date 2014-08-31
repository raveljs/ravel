/**
 * Ravel
 * Copyright (c) 2013 Sean McIntyre <s.mcintyre@xverba.ca>
 */

//Thanks to http://dustinsenos.com/articles/customErrorsInNode

var util = require('util');

var AbstractError = function (msg, constr) {
  Error.captureStackTrace(this, constr || this);
  this.message = msg || 'Error';
};
util.inherits(AbstractError, Error);
AbstractError.prototype.name = 'Abstract Error';

/**
 * Access Error - Thrown when a user attempts to utilize functionality they are
 * not authorized to access due to lack of workspace membership
 *
 * @param {String} msg A string representation of this AccessError
 */
var AccessError = function (msg) {
  AccessError.super_.call(this, msg, this.constructor);
};
util.inherits(AccessError, AbstractError);
AccessError.prototype.name = 'Access Error';

/**
 * Duplicate Entry Error - Thrown when an attempt is made to insert a record 
 * into the database which violates a uniqueness constraint
 *
 * @param {String} msg A string representation of this DuplicateEntryError
 */
var DuplicateEntryError = function (msg) {
  DuplicateEntryError.super_.call(this, msg, this.constructor);
};
util.inherits(DuplicateEntryError, AbstractError);
DuplicateEntryError.prototype.name = 'Duplicate Entry Error';

/**
 * Illegal Value Error - Thrown when the user supplies an illegal value
 *
 * @param {String} msg A string representation of this IllegalValueError
 */
var IllegalValueError = function (msg) {
  IllegalValueError.super_.call(this, msg, this.constructor);
};
util.inherits(IllegalValueError, AbstractError);
IllegalValueError.prototype.name = 'Illegal Value Error';

/**
 * Not Allowed Error - Used to mark API functionality which is not permitted
 * to be accessed under the current application configuration
 *
 * @param {String} msg A string representation of this NotAllowedError
 */
var NotAllowedError = function (msg) {
  NotAllowedError.super_.call(this, msg, this.constructor);
};
util.inherits(NotAllowedError, AbstractError);
NotAllowedError.prototype.name = 'Not Allowed Error';

/**
 * Not Found Error - Thrown when a record is expected to exist in the ravel
 * database, but is not found.
 *
 * @param {String} msg A string representation of this NotFoundError
 */
var NotFoundError = function (msg) {
  NotFoundError.super_.call(this, msg, this.constructor);
};
util.inherits(NotFoundError, AbstractError);
NotFoundError.prototype.name = 'Not Found Error';


/**
 * Not Implemented Error - Used to mark API functionality which has not yet
 * been implemented
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
var NotImplementedError = function (msg) {
  NotImplementedError.super_.call(this, msg, this.constructor);
};
util.inherits(NotImplementedError, AbstractError);
NotImplementedError.prototype.name = 'Not Implemented Error';

/**
 * Range Out Of Bounds Error - Used when a range of data is requested from a set
 * which is outside of the bounds of that set.
 *
 * @param {String} msg A string representation of this NotImplementedError
 */
var RangeOutOfBoundsError = function (msg) {
  RangeOutOfBoundsError.super_.call(this, msg, this.constructor);
};
util.inherits(RangeOutOfBoundsError, AbstractError);
RangeOutOfBoundsError.prototype.name = 'Range Out Of Bounds Error';


module.exports = {
  Access: AccessError,
  DuplicateEntry: DuplicateEntryError,
  IllegalValue: IllegalValueError,
  NotAllowed: NotAllowedError,
  NotFound: NotFoundError,
  NotImplemented:NotImplementedError,
  RangeOutOfBounds:RangeOutOfBoundsError
};
