'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Connect-style middleware which authorizes a request to a route, using
 * either a web-based user's session, or a mobile-based user's OAuth 2.0 token.
 *
 * Basically, it's a wrapper around connect-ensure-login that makes
 * it compatible with mobile devices which don't have sessions, but instead 
 * supply an OAuth Bearer token in the x-auth-token header. Token should
 * provide this application with access to a user profile and email address.
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * such as:
 * - 'google-oauth2-ios' (for an iOS device)
 * - 'google-oauth2-web' (for a web browser)
 * See specific authorization provider for more details.
 *
 * This code is very similar to csrf.js, which wraps connect's internal csrf 
 * protection middleware.
 */

module.exports = function authorizeRequest(Ravel, shouldRedirect, allowMobileRegistration) {
  var rest = require('../util/rest')(Ravel);

  var tokenAuth = require('./authorize_token')(Ravel);

  var fail = function(res) {
    if (shouldRedirect) {
      res.redirect(Ravel.get('login route'));
    } else {
      res.status(rest.UNAUTHORIZED).end();
    }
  };

  return function (req, res, next) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      tokenAuth.tokenToProfile(req.headers['x-auth-token'], req.headers['x-auth-client'], function(err, profile) {
        if (err) {
          Ravel.Log.e(err);
          fail(res);
        } else if (allowMobileRegistration) {
          Ravel.get('get or create user function')(Ravel, undefined, undefined, profile, function(err, user) {
            if (err) {
              Ravel.Log.e(err);
              fail(res);
              //next(err);
            } else {
              req.user = user;
              next();
            }
          });
        } else {
          Ravel.get('get user function')(Ravel, profile, function(err, user) {
            if (err) {
              Ravel.Log.e(err);
              fail(res);
              //next(err);
            } else {
              req.user = user;
              next();
            }
          });
        }
      });
    } else {
      //For web front-ends, optionally redirect user to login page
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        fail(res);
      } else {
        next();
      }
    }
  };
};
