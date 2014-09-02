/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Connect-style middleware which authorizes a request to a route, using
 * either a web-based user's session, or a mobile-based user's OAuth 2.0 token.
 *
 * Basically, it's a wrapper around connect-ensure-login that makes
 * it compatible with mobile devices which don't have sessions, but instead 
 * supply an OAuth Bearer token in the x-auth-token header. This Bearer token
 * must have been obtained using at least the following two scopes:
 * - https://www.googleapis.com/auth/userinfo.profile
 * - https://www.googleapis.com/auth/userinfo.email
 * The token is verified with google, and then used to look up a user profile
 * using passport-google-oauth. The result of this verification and lookup is
 * cached in Redis for the duration of the validity of the bearer token, so that
 * subsequent lookups with the same bearer token are faster.
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * which can currently assume the following values:
 * - 'ios' (for an iOS device)
 * - 'web' (for a web browser)
 * 
 * This code is very similar to csrf.js, which wraps connect's internal csrf 
 * protection middleware.
 */

var l = require("./log.js")("authorize_request.js");
var rest = require('./rest');

module.exports = function authorizeRequest(Ravel, allowMobileRegistration) {

  var webFailureRedirect = Ravel.get('web authentication failure redirect path') || '/login';
  var bearerAuth = require('./authorize_bearer_token')(Ravel);

  return function (req, res, next) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      bearerAuth.bearerToProfile(req.headers["x-auth-token"], req.headers['x-auth-client'], function(err, profile) {
        if (err) {
          l.e(err);
          res.status(rest.UNAUTHORIZED).end();
        } else if (allowMobileRegistration) {
          Ravel.get('get or create user function')(Ravel, undefined, undefined, profile, function(err, user) {
            if (err) {
              l.e(err);
              res.status(rest.UNAUTHORIZED).end();
              //next(err);
            } else {
              req.user = user;
              next();
            }
          });
        } else {
          Ravel.get('get user function')(Ravel, profile, function(err, user) {
            if (err) {
              l.e(err);
              res.status(rest.UNAUTHORIZED).end();
              //next(err);
            } else {
              req.user = user;
              next();
            }
          });
        }
      });
    } else {
       if (!req.isAuthenticated || !req.isAuthenticated()) {
        res.status(rest.UNAUTHORIZED).end();
        //next(err);
       } else {
         next();
       }
    }
  };
};
