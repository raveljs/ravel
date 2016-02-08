'use strict';

/**
 * Useful things related to REST, including the
 * automatic translation of Ravel.ApplicationError
 * errors into appropriate response codes
 */

const url = require('url');
const httpCodes = require('./http_codes');
const ApplicationError = require('./application_error');

/**
 * Translates API JavaScript errors into equivalent HTTP response codes, and/or
 * packages the result of the API call into the response. Exposed as $Rest.respond
 * below.
 *
 * @param {Object} ravelInstance a Ravel instance
 * @param {Object} request koa.js request
 * @param {Object} response koa.js response
 * @param {Number | undefined} Desired 'success' response code (20x) to send if
 *                             there are no API errors. 200 OK by default  for
 *                             GET/PUT/DELETE and 201 CREATED by default for POST
 * @param {Object} options any extra data
 */
const buildRestResponse = function(ravelInstance, request, response, okCode, options) {
  if (okCode === undefined) {
    if (response.body && request.method.toUpperCase() === 'POST') {
      okCode = httpCodes.CREATED;
    } else if (response.body) {
      okCode = httpCodes.OK;
    } else {
      okCode = httpCodes.NO_CONTENT;
    }
  } else if (okCode === httpCodes.PARTIAL_CONTENT && response.body !== undefined &&
             options !== undefined && options.start !== undefined &&
             options.end !== undefined && options.count !== undefined) {
    response.set('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);
  }

  if (okCode === httpCodes.CREATED && response.body && response.body.id && request.method.toUpperCase() === 'POST') {
    //try to set location header if we're creating something
    response.set('Location', url.resolve(
      String(request.headers.origin),String(request.url))+'/'+String(response.body.id));
  }

  response.status = okCode;
};

class Rest {
  constructor(ravelInstance) {
    this.ravelInstance = ravelInstance;
    Object.assign(this, require('./http_codes'));
  }

  /**
   * Syntactically simpler version of buildRestResponse
   * which is exposed to clients for callback-building.
   *
   * @param {Number | undefined} okCode Desired 'success' response code (20x) to send if
   *                                    there are no API errors. 200 OK by default  for
   *                                    GET/PUT/DELETE and 201 CREATED by default for POST
   * @param {Object} options any extra data
   * @return {Generator} Koa middleware which will yield to user logic, catch thrown errors,
   *                     and respond with appropriate codes depending on the current verb or
   *                     error.
   */
  respond(okCode, options) {
    const self = this;
    return function*(next) {
      yield next;
      buildRestResponse(self.ravelInstance, this.request, this.response, okCode, options);
    };
  }

  /**
   * Generic error-handling middleware. Catches exceptions and converts them
   * into appropriate HTTP status codes.
   * Automatically applied before all other middleware in Ravel.
   */
  errorHandler() {
    return function*(next) {
      try {
        yield next;
      } catch (err) {
        if (err instanceof ApplicationError.General) {
          this.response.status = err.code;
          this.response.body = err.name + ': ' + err.message;
        } else {
          this.response.status = httpCodes.INTERNAL_SERVER_ERROR;
          this.response.body = `Error: ${err.message}`;
        }
      }
    };
  }
}

module.exports = Rest;
