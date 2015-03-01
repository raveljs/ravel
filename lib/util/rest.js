'use strict';

/**
 * Useful things related to REST, including the
 * automatic translation of Ravel.ApplicationError
 * errors into appropriate response codes
 */

var url = require('url');

module.exports = function(Ravel) {
  var scope = {
    OK:200,
    CREATED:201,
    NO_CONTENT:204,
    PARTIAL_CONTENT:206,
    UNAUTHORIZED:401,
    FORBIDDEN:403,
    NOT_FOUND:404,
    METHOD_NOT_ALLOWED:405,
    CONFLICT:409,
    REQUESTED_RANGE_NOT_SATISFIABLE:416,
    INTERNAL_SERVER_ERROR:500,
    NOT_IMPLEMENTED:501,

    /**
     * Translates API JavaScript errors into equivalent HTTP response codes, and/or
     * packages the result of the API call into the response.
     *
     * @param {Object} req Express.js request
     * @param {Object} res Express.js response
     * @param {Object | null} err Error object from API, or null
     * @param {Object | undefined} result the JSON payload to send in the reponse
     * @param {Object | undefined} Desired 'success' response code (20x) to send if
     *                             there are no API errors. 200 OK by default  for
     *                             GET/PUT/DELETE and 201 CREATED by default for POST
     * @param {Object} options any extra data
     */
    buildRestResponse: function(req, res, err, result, okCode, options) {
      if (okCode === undefined) {
        if (result && req.method === 'POST') {
          okCode = scope.CREATED;
        } else if (result) {
          okCode = scope.OK;
        } else {
          okCode = scope.NO_CONTENT;
        }
      } else if (okCode === scope.PARTIAL_CONTENT && result !== undefined &&
                 options !== undefined && options.start !== undefined &&
                 options.end !== undefined && options.count !== undefined) {
        res.setHeader('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);
      }

      if (okCode === scope.CREATED && result && result.id && req.method === 'POST') {
        //try to set location header if we're creating something
        res.location(url.resolve(String(req.headers.origin),String(req.url))+'/'+String(result.id));
      }

      if (err) {
        if (err instanceof Ravel.ApplicationError.NotFound) {
          res.status(scope.NOT_FOUND).end();
        } else if (err instanceof Ravel.ApplicationError.Access) {
          res.status(scope.FORBIDDEN).end();
        } else if (err instanceof Ravel.ApplicationError.NotAllowed) {
          res.status(scope.METHOD_NOT_ALLOWED).end();
        } else if (err instanceof Ravel.ApplicationError.NotImplemented) {
          res.status(scope.NOT_IMPLEMENTED).end();
        } else if (err instanceof Ravel.ApplicationError.DuplicateEntry) {
          res.status(scope.CONFLICT).end();
        } else if (err instanceof Ravel.ApplicationError.RangeOutOfBounds) {
          res.status(scope.REQUESTED_RANGE_NOT_SATISFIABLE).end();
        } else if (err instanceof Ravel.ApplicationError.IllegalValue) {
          res.status(scope.NOT_FOUND).end();
        } else {
          res.status(scope.INTERNAL_SERVER_ERROR).end();
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
    }
  };

  return scope;
};
