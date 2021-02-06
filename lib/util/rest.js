'use strict';

const httpCodes = require('./http_codes');

/*!
 * Simplifies HTTP response codes and headers. Exposed as $Rest.respond below.
 *
 * @param {object} ravelInstance - A `ravel instance`.
 * @param {object} request - Koa.js request.
 * @param {object} response - Koa.js response.
 * @param {object} options - Any extra data, including:
 *   - {(number | undefined)} okCode Desired 'success' response code (20x) to send if
 *                                   there are no API errors. 200 OK by default  for
 *                                   GET/PUT/DELETE and 201 CREATED by default for POST
 *   - {(number | undefined)} start
 *   - {(number | undefined)} end
 *   - {(number | undefined)} count
 * @private
 */
const buildRestResponse = function (ravelInstance, request, response, options) {
  options = options || {};
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
    response.set('Content-Range', 'items ' + options.start + '-' + options.end + '/' + options.count);
  }

  if (options.okCode === httpCodes.CREATED &&
      response.body && response.body.id && request.method.toUpperCase() === 'POST') {
    // try to set location header if we're creating something
    const resource = `${String(request.url)}/${String(response.body.id)}`;
    try {
      const url = new URL(resource, String(request.headers.origin));
      response.set('Location', url.toString());
    } catch (err) {
      // currently no good way to deal with relative URLs https://github.com/nodejs/node/issues/12682
      response.set('Location', resource);
    }
  }

  response.status = options.okCode;
};

const sRavelInstance = Symbol.for('_ravelInstance');

/**
 * Useful things related to REST, including the
 * automatic translation of Ravel.$err
 * errors into appropriate response codes.
 *
 * @private
 */
class Rest {
  /**
   * @param {Ravel} ravelInstance - A reference to a Ravel app instance.
   * @private
   */
  constructor (ravelInstance) {
    this[sRavelInstance] = ravelInstance;
    Object.assign(this, require('./http_codes'));
  }

  /**
   * Syntactically simpler version of buildRestResponse
   * which is exposed to clients for callback-building.
   *
   * @returns {AsyncFunction} Koa middleware which will yield to user logic, catch thrown errors,
   *                         and respond with appropriate codes depending on the current verb or
   *                         error. Status can be configured using ctx.respondOptions.okCode.
   * @private
   */
  respond () {
    return async (ctx, next) => {
      try {
        // overwrite ctx.status to be an alias for respondOptions.okCode
        // if it's already been overwritten, that's okay
        Object.defineProperty(ctx, 'status', {
          get: () => ctx.respondOptions ? ctx.respondOptions.okCode : undefined,
          set: (newStatus) => {
            if (ctx.respondOptions === undefined) {
              ctx.respondOptions = {};
            }
            ctx.respondOptions.okCode = newStatus;
          }
        });
      } finally {
        await next();
        buildRestResponse(this[sRavelInstance], ctx.request, ctx.response, ctx.respondOptions);
      }
    };
  }

  /**
   * Generic error-handling middleware. Catches exceptions and converts them
   * into appropriate HTTP status codes.
   * Automatically applied before all other middleware in Ravel.
   *
   * @private
   */
  errorHandler () {
    return async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        // always overwrite body with error message
        ctx.response.type = 'text/plain; charset=utf-8';
        if (err instanceof this[sRavelInstance].$err.General) {
          ctx.response.status = err.code;
          if (ctx.method !== 'HEAD') ctx.response.body = err.message;
        } else {
          this[sRavelInstance].$log.trace(err.stack);
          ctx.response.status = httpCodes.INTERNAL_SERVER_ERROR;
          if (ctx.method !== 'HEAD') ctx.response.body = err.stack;
        }
      }
    };
  }
}

/*!
 * Export `Rest`
 */
module.exports = Rest;
