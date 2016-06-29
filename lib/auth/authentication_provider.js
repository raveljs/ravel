'use strict';

const ApplicationError = require('../util/application_error');
const sProviders = Symbol.for('_authenticationProviders');

/**
 * The abstract superclass of AuthenticationProviders - modules
 * which are capable of initializing Passport.js with
 * a particular strategy, and seamlessly verifying requests
 * issued by mobile clients via header tokens instead of sessions.
 */
class AuthenticationProvider {
  /**
   * Anything that should happen when this `AuthenticationProvider` is connected to a
   * Ravel application via `require('provider-name')(app)` should happen here.
   * This includes, but is not limited to, the declaration of parameters supporting
   * this module via `ravelInstance.registerParameter()`. If you override this constructor,
   * be sure to call `super(ravelInstance)`!
   * @param {Ravel} ravelInstance an instance of a Ravel application
   */
  constructor(ravelInstance) {
    this.log = ravelInstance.log.getLogger(this.name);
    if (!ravelInstance[sProviders]) {
      ravelInstance[sProviders] = [];
    }

    ravelInstance[sProviders].push(this);
  }

  /**
   * The name of the AuthenticationProvider
   * Override, and  try to pick something unique within the Ravel ecosystem.
   * @type {String}
   */
  get name() {
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement get name()`);
  }

  /**
   * Initialize passport.js with a strategy
   *
   * @param {Object} koaRouter An koa-router instance
   * @param {Object} passport A passport.js object
   * @param {Function} verify See passport.js Strategy verify callback.
   *                          Just pass this to the strategy you create
   *                          and activate via passport.use.
   */
  init(app, passport, verify) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement init(koaApp, passport, verify)`);
  }

  /**
   * Does this authentication provider handle the given client type?
   *
   * @param {String} client A client type, such as google-oauth2-ios
   * @return {Boolean} true iff this provider handles the given client
   */
  handlesClient(client) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement handlesClient(client)`);
  }

  /**
   * Transform a credential for an auth'd user into a user profile, iff the
   * credential is valid for this application.
   *
   * @param {String} credential A credential
   * @param {String} client A client type, such as google-oauth2-ios
   * @return {Promise} resolveed with user profile iff the credential is valid for this application, rejects otherwise
   */
  credentialToProfile(credential, client) { //eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement tokenToProfile(credential, client)`));
  };
}

/*!
 * Export accessor for `AuthenticationProvider`s list
 */
module.exports = function(Ravel) {
  Ravel.prototype.authenticationProviders = function() {
    return this[sProviders] ? this[sProviders] : [];
  };
};

/*!
 * Export `AuthenticationProvider` class
 */
module.exports.AuthenticationProvider = AuthenticationProvider;
