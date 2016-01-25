'use strict';

/**
 * Useful things related to REST, including the
 * automatic translation of Ravel.ApplicationError
 * errors into appropriate response codes
 */

const url = require('url');
const httpCodes = require('./http_codes');

/**
 * Translates API JavaScript errors into equivalent HTTP response codes, and/or
 * packages the result of the API call into the response. Exposed as $Rest.respond
 * below.
 *
 * @param {Object} Ravel a Ravel instance
 * @param {Object} req Express.js request
 * @param {Object} res Express.js response
 * @param {Object | null} err Error object from API, or null
 * @param {Object | undefined} result the JSON payload to send in the reponse
 * @param {Number | undefined} Desired 'success' response code (20x) to send if
 *                             there are no API errors. 200 OK by default  for
 *                             GET/PUT/DELETE and 201 CREATED by default for POST
 * @param {Object} options any extra data
 */
const buildRestResponse = function(Ravel, req, res, err, result, okCode, options) {
  if (okCode === undefined) {
    if (result && req.method === 'POST') {
      okCode = httpCodes.CREATED;
    } else if (result) {
      okCode = httpCodes.OK;
    } else {
      okCode = httpCodes.NO_CONTENT;
    }
  } else if (okCode === httpCodes.PARTIAL_CONTENT && result !== undefined &&
             options !== undefined && options.start !== undefined &&
             options.end !== undefined && options.count !== undefined) {
    res.setHeader('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);
  }

  if (okCode === httpCodes.CREATED && result && result.id && req.method === 'POST') {
    //try to set location header if we're creating something
    res.location(url.resolve(String(req.headers.origin),String(req.url))+'/'+String(result.id));
  }

  if (err) {
    if (err instanceof Ravel.ApplicationError.General) {
      res.status(err.code).send(err.name + ': ' + err.message);
    } else {
      res.status(httpCodes.INTERNAL_SERVER_ERROR).end();
    }
  } else {
    //protect against JSON vulnerability
    //http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/
    if (Ravel.get('disable json vulnerability protection') && result) {
      res.status(okCode).send(result);
    } else if (result) {
      var prefixed = ')]}\',\n' + JSON.stringify(result);
      res.status(okCode).send(prefixed);
    } else {
      res.status(okCode).end();
    }
  }
};

class Rest {
  constructor(Ravel) {
    this.Ravel = Ravel;
    Object.assign(this, require('./http_codes'));
  }

  /**
   * Syntactically simpler version of buildRestResponse
   * which is exposed to clients for callback-building.
   *
   * @param {Object} req Express.js request
   * @param {Object} res Express.js response
   * @param {Number | undefined} Desired 'success' response code (20x) to send if
   *                             there are no API errors. 200 OK by default  for
   *                             GET/PUT/DELETE and 201 CREATED by default for POST
   * @param {Object} options any extra data
   * @return {Function} An (err, result) format callback which will
   *                    produce an appropriate HTTP response given
   *                    those values.
   */
  respond(req, res, okCode, options) {
    const self = this;
    return function(err, result) {
      return buildRestResponse(self.Ravel, req, res, err, result, okCode, options);
    };
  }
}

module.exports = Rest;
