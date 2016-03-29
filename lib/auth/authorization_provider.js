'use strict';

const sName = Symbol('name');
const ApplicationError = require('../util/application_error');

/**
 * The abstract superclass of AuthorizationProviders - modules
 * which are capable of initializing Passport.js with
 * a particular OAuth2 strategy, and seamlessly verifying
 * requests issued by mobile clients via OAuth2 tokens
 * instead of sessions.
 */
class AuthorizationProvider {
  constructor(name) {
    this[sName] = name;
  }

  /**
   * @return the name of the AuthorizationProvider
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
  init(koaRouter, passport, verify) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthorizationProvider ${this[sName]} must implement init(koaApp, passport, verify)`);
  }

  /**
   * Does this authorization provider handle the given client type?
   *
   * @param client {String} A client type, such as google-oauth2-ios
   * @return {Boolean} true iff this provider handles the given client
   */
  handlesClient(client) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthorizationProvider ${this[sName]} must implement handlesClient(client)`);
  }

  /**
   * Transform an OAuth2 token into a user profile, iff the
   * token is valid for this application.
   *
   * @param token {String} An OAuth2 user token
   * @param client {String}  A client type, such as google-oauth2-ios
   * @return {Promise} resolveed with user profile iff the token is valid for this application, rejects otherwise
   */
  tokenToProfile(token, client) { //eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      `AuthorizationProvider ${this.name} must implement tokenToProfile(token, client, callback)`));
  };
}

/**
 * Populate Ravel class with static reference to AuthorizationProvider class
 */
module.exports = function(Ravel) {
  Ravel.AuthorizationProvider = AuthorizationProvider;
};;
