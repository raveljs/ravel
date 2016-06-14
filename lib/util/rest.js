'use strict';

const url = require('url');
const httpCodes = require('./http_codes');

/**
 * Simplifies HTTP response codes and headers. Exposed as $Rest.respond below.
 *
 * @param {Object} ravelInstance a `ravel instance`
 * @param {Object} request koa.js request
 * @param {Object} response koa.js response
 * @param {Object} options any extra data, including:
 *   @param {(Number | undefined)} okCode Desired 'success' response code (20x) to send if
 *                                      there are no API errors. 200 OK by default  for
 *                                      GET/PUT/DELETE and 201 CREATED by default for POST
 *   @param {(Number | undefined)} start
 *   @param {(Number | undefined)} end
 *   @param {(Number | undefined)} count
 * @api private
 */
const buildRestResponse = function(ravelInstance, request, response, options) {
  options = options ? options : {};

  if (options.okCode === undefined) {
    if (response.body && request.method.toUpperCase() === 'POST') {
      options.okCode = httpCodes.CREATED;
    } else if (response.body) {
      options.okCode = httpCodes.OK;
    } else if (response.status >= 200 && response.status < 300) {
      // set no-content on this route if there's no body and no status is already set
      options.okCode = httpCodes.NO_CONTENT;
    } else {
      options.okCode = response.status;
    }
  } else if (options.okCode === httpCodes.PARTIAL_CONTENT && response.body !== undefined &&
             options !== undefined && options.start !== undefined &&
             options.end !== undefined && options.count !== undefined) {
    response.set('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);
  }

  if (options.okCode === httpCodes.CREATED &&
      response.body && response.body.id && request.method.toUpperCase() === 'POST') {
    //try to set location header if we're creating something
    response.set('Location', url.resolve(
      String(request.headers.origin),String(request.url))+'/'+String(response.body.id));
  }

  response.status = options.okCode;
};

const sRavelInstance = Symbol.for('_ravelInstance');

/**
 * Useful things related to REST, including the
 * automatic translation of Ravel.ApplicationError
 * errors into appropriate response codes
 * @api private
 */
class Rest {
  /**
   * @api private
   */
  constructor(ravelInstance) {
    this[sRavelInstance] = ravelInstance;
    Object.assign(this, require('./http_codes'));
  }

  /**
   * Syntactically simpler version of buildRestResponse
   * which is exposed to clients for callback-building.
   *
   * @param {Object} options any extra data
   * @return {Generator} Koa middleware which will yield to user logic, catch thrown errors,
   *                     and respond with appropriate codes depending on the current verb or
   *                     error. Status can be configured using ctx.respondOptions.okCode.
   * @api private
   */
  respond() {
    const self = this;
    return function*(next) {
      yield next;
      buildRestResponse(self[sRavelInstance], this.request, this.response, this.respondOptions);
    };
  }

  /**
   * Generic error-handling middleware. Catches exceptions and converts them
   * into appropriate HTTP status codes.
   * Automatically applied before all other middleware in Ravel.
   * @api private
   */
  errorHandler() {
    const self = this;
    return function*(next) {
      try {
        yield next;
      } catch (err) {
        if (err instanceof self[sRavelInstance].ApplicationError.General) {
          this.response.status = err.code;
          this.response.body = err.message;
        } else {
          self[sRavelInstance].log.trace(err.stack);
          this.response.status = httpCodes.INTERNAL_SERVER_ERROR;
        }
      }
    };
  }
}

/*!
 * Export `Rest`
 */
module.exports = Rest;
