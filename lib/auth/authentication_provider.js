'use strict';

const sName = Symbol.for('name');
const ApplicationError = require('../util/application_error');

/**
 * The abstract superclass of AuthenticationProviders - modules
 * which are capable of initializing Passport.js with
 * a particular strategy, and seamlessly verifying requests
 * issued by mobile clients via header tokens instead of sessions.
 */
class AuthenticationProvider {
  constructor(name) {
    this[sName] = name;
  }

  /**
   * @return the name of the AuthenticationProvider
   */
  get name() {
    return this[sName];
  }

  /**
   * Initialize passport.js with a strategy
   *
   * @param koaRouter {Object} An koa-router instance
   * @param passport {Object} A passport.js object
   * @param verify {Function} See passport.js Strategy verify callback.
   *                          Just pass this to the strategy you create
   *                          and activate via passport.use.
   */
  init(app, passport, verify) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this[sName]} must implement init(koaApp, passport, verify)`);
  }

  /**
   * Does this authentication provider handle the given client type?
   *
   * @param client {String} A client type, such as google-oauth2-ios
   * @return {Boolean} true iff this provider handles the given client
   */
  handlesClient(client) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this[sName]} must implement handlesClient(client)`);
  }

  /**
   * Transform a credential for an auth'd user into a user profile, iff the
   * credential is valid for this application.
   *
   * @param credential {String} A credential
   * @param client {String}  A client type, such as google-oauth2-ios
   * @return {Promise} resolveed with user profile iff the credential is valid for this application, rejects otherwise
   */
  credentialToProfile(credential, client) { //eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.name} must implement tokenToProfile(credential, client)`));
  };
}

/**
 * Export AuthenticationProvider class
 */
module.exports = AuthenticationProvider;
