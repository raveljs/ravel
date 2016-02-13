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
const symbols = require('./symbols');

const sRavelInstance = Symbol('_ravelInstance');
const sShouldRedirect = Symbol('_shouldRedirect');
const sAllowMobileRegistration = Symbol('_allowMobileRegistration');
const sTokenAuth = Symbol('_tokenAuth');

class AuthorizationMiddleware {
  constructor(ravelInstance, shouldRedirect, allowMobileRegistration) {
    this[sRavelInstance] = ravelInstance;
    this[sShouldRedirect] = shouldRedirect;
    this[sAllowMobileRegistration] = allowMobileRegistration;
    this[sTokenAuth] = require('./authorize_token')(ravelInstance);
  }

  get ravelInstance() {
    return this[sRavelInstance];
  }

  get shouldRedirect() {
    return this[sShouldRedirect];
  }

  get allowMobileRegistration() {
    return this[sAllowMobileRegistration];
  }

  middleware() {
    const self = this;
    return function*(next) {
      const ctx = this;

      let promise;
      if (ctx.headers['x-auth-token'] && ctx.headers['x-auth-client']) {
        promise = self[sTokenAuth].tokenToProfile(ctx.headers['x-auth-token'], ctx.headers['x-auth-client'])
        .then((profile) => {
          if (self[sAllowMobileRegistration]) {
            return self[sRavelInstance][symbols.authConfigModule].getOrCreateUser(
              self[sRavelInstance], undefined, undefined, profile
            );
          } else {
            return self[sRavelInstance][symbols.authConfigModule].getUser(profile);
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
        self[sRavelInstance].Log.error(err);
        if (self[sShouldRedirect]) {
          ctx.redirect(self[sRavelInstance].get('login route'));
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
