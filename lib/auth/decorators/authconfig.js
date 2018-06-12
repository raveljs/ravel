'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * A decorator for a `Module`, indicating that it will offer
 * specific functions which encapsulate the configuration
 * of passport.js. For more information on how to implement
 * an `@authconfig` module, please see the README for
 * an existing Ravel AuthenticationProvider.
 *
 * @param {Class} target - The class to declare as the `@authconfig` class.
 */
function authconfig (target) {
  Metadata.putClassMeta(target.prototype, '@authconfig', 'enabled', true);

  if (!target.prototype.serializeUser) {
    target.prototype.serializeUser = function (profile) { // eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        `An authentication provider was specified, but no @authconfig Module was
        supplied with an implemented serializeUser() method`));
    };
  }
  if (!target.prototype.deserializeUser) {
    target.prototype.deserializeUser = function (userId) { // eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        `An authentication provider was specified, but no @authconfig Module was
        supplied with an implemented deserializeUser() method`));
    };
  }
  if (!target.prototype.verify) {
    // args should be tokens, username/pw, etc.
    target.prototype.verify = function (
      providerName, ...args // eslint-disable-line no-unused-vars
    ) {
      return Promise.reject(new ApplicationError.NotImplemented(
        `An authentication provider was specified, but no @authconfig Module was
        supplied with an implemented verify() method.`));
    };
  }
  if (!target.prototype.deserializeOrCreateUser) {
    target.prototype.deserializeOrCreateUser = function (profile) { // eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authentication provider was specified, but no @authconfig Module was ' +
        'supplied with an implemented deserializeOrCreateUser()'));
    };
  }
}

/*!
 * Export // &#64;authconfig decorator
 */
module.exports = authconfig;
