'use strict';

/**
 * Connect-style middleware which wraps existing Connect cross-site request
 * forging protection, but bypasses it if the user supplies a VALID OAuth2.0
 * bearer token for the application.
 *
 * This should allow mobile apps to POST/PUT/DELETE without a CSRF token.
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * which can currently assume the following values:
 * - 'ios' (for an iOS device)
 * - 'web' (for a web browser)
 *
 * This code is very similar to authorize_request.js, which wraps
 * connect-ensure-login.
 */

var originalCSRF = require('csurf');
var httpCodes = require('../util/http_codes');

module.exports = function csrf(Ravel, options) {
  var expressCSRF = originalCSRF(options);
  var tokenAuth = require('./authorize_token')(Ravel);

  return function(req, res, next) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      tokenAuth.tokenToProfile(req.headers['x-auth-token'], req.headers['x-auth-client'], function(err) {
        if (err) {
          next(err);
        } else {
          //allow csrf protection bypass
          next();
        }
      });
    } else {
      try {
        //proceed normally with cross-site request forging protection
        expressCSRF(req, res, next);
      } catch (e) {
        res.status(httpCodes.FORBIDDEN).send('Invalid CSRF token.');
      }
    }
  };
};
