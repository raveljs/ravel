'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
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
 
module.exports = function csrf(Ravel, options) {  
  var expressCSRF = originalCSRF(options);
  var bearerAuth = require('./authorize_bearer_token')(Ravel); 
  var rest = require('./rest')(Ravel);

  return function(req, res, next) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      bearerAuth.validateBearer(req.headers['x-auth-token'], req.headers['x-auth-client'], function(err) {
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
        res.status(rest.FORBIDDEN).send('Invalid CSRF token.');
      }
    }
  };
};
