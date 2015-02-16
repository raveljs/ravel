'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

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
     *                             there are no API errors. 200 OK by default.
     * @param {Object} options any extra data
     */
    buildRestResponse: function(req, res, err, result, okCode, options) {
      if (okCode === undefined) {
        if (result) {
          okCode = scope.OK;
        } else {
          okCode = scope.NO_CONTENT;
        }
      } else if (okCode === scope.CREATED && result && result.id) {
        //try to set location header if we're creating something
        res.location(req.headers.origin+req.url+result.id);
      } else if (okCode === scope.PARTIAL_CONTENT && result) {
        res.setHeader('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);
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
          res.status(scope.INTERNAL_SERVER_ERROR).end();
        } else {
          console.error(err.message);
          res.status(scope.INTERNAL_SERVER_ERROR).end();
        }
      } else {
        //protect against JSON vulnerability
        //http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/
        if (Ravel.get('disable json vulnerability protection')) {
          res.status(okCode).send(result);
        } else if (result) {
          var prefixed = ')]}\',\n' + JSON.stringify(result);
          res.status(okCode).send(prefixed);
        } else {
          res.status(okCode).end();
        }
      }
    },

    /**
     * Super-useful function for handling range-compatible GET requests on
     * collections - but it only works if you write the API calls to support it.
     *
     * @param {Object} req Express.js request
     * @param {Object} res Express.js response
     * @param {Function} totalCountFn a function which accepts the arguments
     *                   in idArgs, followed by a callback(err, {Number})
     * @param {Function} getFn a function which accepts the arguments in idArgs,
     *                   followed by a {Number} start, a {Number} end, and a
     *                   callback(err, {Array})
     * @param {Array} idArgs an array of arguments which uniquely identifies the
     *                collection in question and can be supplied to both
     *                totalCountFn and getFn
     */
    handleRangeGet: function(req, res, totalCountFn, getFn, idArgs) {
      var rest = module.exports;
      if (req.headers['Range']) {
        var totalCountArgs = idArgs.slice(0); //clone array
        totalCountArgs.push(function(err, count) {
          var range = req.range(count);
          if (!range) {
            idArgs.push(
              0,
              1,
              function(err, result) {
                scope.buildRestResponse(req, res, err, result);
              }
            );
            getFn.apply(this, idArgs);
          } else if (range === -1) {
            scope.buildRestResponse(req, res, new Ravel.ApplicationError.RangeOutOfBounds(), undefined);
          } else if (range === -2) {
            scope.buildRestResponse(req, res, new Ravel.ApplicationError.RangeOutOfBounds(), undefined);
          } else {
            idArgs.push(
              range[0].start,
              range[0].end,
              function(err, result) {
                scope.buildRestResponse(
                  req,
                  res,
                  err,
                  result,
                  rest.PARTIAL_CONTENT,
                  {start:range[0].start, end:range[0].end, count:count}
                );
              }
            );
            getFn.apply(this, idArgs);
          }
        });
        totalCountFn.apply(this, totalCountArgs);
      } else {
        idArgs.push(
          undefined,
          undefined,
          function(err, result) {
            scope.buildRestResponse(req, res, err, result);
          }
        );
        getFn.apply(this, idArgs);
      }
    }
  };

  return scope;
};
