'use strict';

/**
 * Factory for Koa-style middleware which authorizes a request to a route, using
 * either a web-based user's session, or a mobile-based user's OAuth 2.0 token
 * (the latter being supplied via the x-auth-token header).
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * such as:
 * - 'google-oauth2-ios' (for an iOS device)
 * - 'google-oauth2-web' (for a web browser)
 * See specific authorization provider for more details.
 *
 */

const httpCodes = require('../util/http_codes');

class AuthorizationMiddleware {
  constructor(ravelInstance, shouldRedirect, allowMobileRegistration) {
    this._ravelInstance = ravelInstance;
    this._shouldRedirect = shouldRedirect;
    this._allowMobileRegistration = allowMobileRegistration;
    this._tokenAuth = require('./authorize_token')(ravelInstance);
  }

  middleware() {
    const self = this;
    return function*(next) {
      const ctx = this;

      let promise;
      if (ctx.headers['x-auth-token'] && ctx.headers['x-auth-client']) {
        promise = self._tokenAuth.tokenToProfile(ctx.headers['x-auth-token'], ctx.headers['x-auth-client'])
        .then((profile) => {
          if (self._allowMobileRegistration) {
            return self._ravelInstance.get('get or create user function')(
              self._ravelInstance, undefined, undefined, profile
            );
          } else {
            return self._ravelInstance.get('get user function')(self._ravelinstance, profile);
          }
        })
        .then((user) => {
          // set ctx.user for mobile users
          ctx.user = user;
        });
      } else if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
        // Web user isn't authenticated
        promise = Promise.reject(false);
      } else {
        // Web user is authenticated and ctx.user has been set by passport.
        promise = Promise.resolve();
      }

      // try out the promise, and then try to yield next
      // catch all errors, regardless of client type, and behave appropriately
      try {
        yield promise;
        yield next;
      } catch (err) {
        // do not yield next!
        self._ravelInstance.Log.error(err);
        if (self._shouldRedirect) {
          ctx.redirect(self._ravelInstance.get('login route'));
        } else {
          ctx.status = httpCodes.UNAUTHORIZED;
        }
      }
    };
  }
}

module.exports = function(Ravel) {
  Ravel.AuthorizationMiddleware = AuthorizationMiddleware;
};
