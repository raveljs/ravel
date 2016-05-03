'use strict';

const httpCodes = require('../util/http_codes');
const symbols = require('./symbols');

const sRavelInstance = Symbol.for('_ravelInstance');
const sShouldRedirect = Symbol.for('_shouldRedirect');
const sAllowMobileRegistration = Symbol.for('_allowMobileRegistration');
const sTokenAuth = Symbol.for('_tokenAuth');

/**
 * Factory for Koa-style middleware which authorizes a request to a route, using
 * either a web-based user's session, or a mobile-based user's authorization token
 * (the latter being supplied via the x-auth-token header).
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * such as:
 * - 'google-oauth2-ios' (for an iOS device)
 * - 'google-oauth2-web' (for a web browser)
 * See specific authorization provider for more details.
 *
 */
class AuthorizationMiddleware {

  /**
   * @param ravelInstance {Object} An instance of a Ravel app
   * @param shouldRedirect {Boolean} true iff this middleware should redirect to the login page when a
   *                                 user is not authorized
   * @param allowMobileRegistration {Boolean} true iff this middleware should automatically register mobile clients
   *                                          the first time they are seen.
   *
   */
  constructor(ravelInstance, shouldRedirect, allowMobileRegistration) {
    this[sRavelInstance] = ravelInstance;
    this[sShouldRedirect] = shouldRedirect;
    this[sAllowMobileRegistration] = allowMobileRegistration;
    this[sTokenAuth] = require('./authorize_token')(ravelInstance);
  }

  /**
   * @return the Ravel app associated with this AuthorizationMiddleware. Useful for subclasses.
   */
  get ravelInstance() {
    return this[sRavelInstance];
  }

  /**
   * @return the value of shouldRedirect, as passed into the constructor. Useful for subclasses.
   */
  get shouldRedirect() {
    return this[sShouldRedirect];
  }

  /**
   * @return the value of allowMobileRegistration, as passed into the constructor. Useful for subclasses.
   */
  get allowMobileRegistration() {
    return this[sAllowMobileRegistration];
  }

  /**
   * @return {Generator} koa-compatible middleware which validates a web session or mobile auth token,
   *                     potentially redirecting if the user is not authorized, or registering an
   *                     unknown mobile client automatically.
   */
  middleware() {
    const self = this;
    return function*(next) {
      const ctx = this;

      let promise;
      if (ctx.headers['x-auth-token'] && ctx.headers['x-auth-client']) {
        promise = self[sTokenAuth].credentialToProfile(ctx.headers['x-auth-token'], ctx.headers['x-auth-client'])
        .then((profile) => {
          if (self[sAllowMobileRegistration]) {
            return self[sRavelInstance][symbols.authConfigModule].getOrCreateUserByProfile(profile);
          } else {
            return self[sRavelInstance][symbols.authConfigModule].getUserById(profile.id);
          }
        })
        .then((user) => {
          // set ctx.user for mobile users
          ctx.user = user;
        });
      } else if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
        // Web user isn't authenticated
        promise = Promise.reject(
          new self[sRavelInstance].ApplicationError.Authorization(
            `User with session id=${ctx.request.headers['koa.sid']} is not authenticated`));
      } else {
        // Web user is authenticated and ctx.user has been set by passport.
        promise = Promise.resolve();
      }

      // try out the promise, and then try to yield next
      // catch all errors, regardless of client type, and behave appropriately
      let errorFromNext = false;
      try {
        yield promise;
        errorFromNext = true;
        yield next;
      } catch (err) {
        if (!errorFromNext && self[sShouldRedirect]) {
          self[sRavelInstance].Log.error(err);
          ctx.redirect(self[sRavelInstance].get('login route'));
        } else if (!errorFromNext) {
          self[sRavelInstance].Log.error(err);
          ctx.status = httpCodes.UNAUTHORIZED;
        } else {
          // throw errors which don't come from auth
          throw err;
        }
      }
    };
  }
}

module.exports = AuthorizationMiddleware;
