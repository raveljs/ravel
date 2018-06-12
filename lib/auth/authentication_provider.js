'use strict';

const ApplicationError = require('../util/application_error');
const sProviders = Symbol.for('_authenticationProviders');

/**
 * The abstract superclass of `AuthenticationProvider`s - modules
 * which are capable of initializing Passport.js with
 * a particular strategy, and seamlessly verifying requests
 * issued by mobile clients via header tokens instead of sessions.
 * Extend this class to implement a custom `AuthenticationProvider`.
 */
class AuthenticationProvider {
  /**
   * Anything that should happen when this `AuthenticationProvider` is connected to a Ravel
   * application via `require('provider-name')(app)` should happen here.
   * This includes, but is not limited to, the declaration of parameters supporting
   * this module via `ravelInstance.registerParameter()`. If you override this constructor,
   * be sure to call `super(ravelInstance)`.
   *
   * @param {Ravel} ravelInstance - An instance of a Ravel application.
   */
  constructor (ravelInstance) {
    this.ravelInstance = ravelInstance;
    this.log = ravelInstance.log.getLogger(this.name);
    this.ApplicationError = ravelInstance.ApplicationError;
    if (!ravelInstance[sProviders]) {
      ravelInstance[sProviders] = [];
    }

    ravelInstance[sProviders].push(this);

    ravelInstance.once('pre listen', () => {
      ravelInstance.log.debug(`Using AuthenticationProvider ${this.constructor.name}, name: ${this.name}`);
    });
  }

  /**
   * The name of the AuthenticationProvider.
   * Override, and try to pick something unique within the Ravel ecosystem.
   *
   * @type String
   */
  get name () {
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement get name()`);
  }

  /**
   * Initialize passport.js with a strategy.
   *
   * @param {Object} app - A koa-router instance.
   * @param {Object} passport - A passport.js object.
   * @param {Function} verify - See passport.js Strategy verify callback.
   *                          Just pass this to the strategy you create
   *                          and activate via passport.use.
   */
  init (app, passport, verify) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement init(koaApp, passport, verify)`);
  }

  /**
   * Reveals whether or not this authentication provider handle the given client type.
   *
   * @param {string} client - A client type, such as google-oauth2-ios.
   * @returns {boolean} - True iff this provider handles the given client.
   */
  handlesClient (client) { // eslint-disable-line no-unused-vars
    throw new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement handlesClient(client)`);
  }

  /**
   * Transform a credential for an auth'd user into a user profile, iff the
   * credential is valid for this application.
   *
   * @param {string} credential - A credential.
   * @param {string} client - A client type, such as google-oauth2-ios.
   * @returns {Promise} Resolved with an object containing the user profile and a cache expiry time
   *   ({expiry: 10, profile:{...}}) iff the credential is valid for this application, rejects otherwise.
   */
  credentialToProfile (credential, client) { // eslint-disable-line no-unused-vars
    return Promise.reject(new ApplicationError.NotImplemented(
      `AuthenticationProvider ${this.constructor.name} must implement tokenToProfile(credential, client)`));
  }
}

/*!
 * Export accessor for `AuthenticationProvider`s list
 */
module.exports = function (Ravel) {
  Ravel.prototype.authenticationProviders = function () {
    return this[sProviders] ? this[sProviders] : [];
  };
};

/*!
 * Export `AuthenticationProvider` class
 */
module.exports.AuthenticationProvider = AuthenticationProvider;
