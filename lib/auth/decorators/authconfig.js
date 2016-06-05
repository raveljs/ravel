'use strict';

const ApplicationError = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * &#64;authconfig
 *
 * A decorator for a module, indicating that it will offer
 * specific functions which encapsulate the configuration
 * of passport.js.
 */
function authconfig(target) {
  Metadata.putClassMeta(target.prototype, '@authconfig', 'enabled', true);

  if (!target.prototype.getUserById) {
    target.prototype.getUserById = function(userId) { //eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authentication provider was specified, but no @authconfig Module was ' +
        'supplied with an implemented getUserById()'));
    };
  }
  if (!target.prototype.getOrCreateUserByProfile) {
    target.prototype.getOrCreateUserByProfile = function(profile) { //eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authentication provider was specified, but no @authconfig Module was ' +
        'supplied with an implemented getOrCreateUserByProfile()'));
    };
  }
  if (!target.prototype.verifyCredentials) {
    // args should be tokens, username/pw, etc.
    target.prototype.verifyCredentials = function(
      ...args //eslint-disable-line no-unused-vars
    ) {
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authentication provider was specified, but no @authconfig Module was ' +
        'supplied with an implemented verifyCredentials()'));
    };
  }
};

/**
 * Export function which adds the authconfig decorator as a static property of any class
 */
module.exports = function(target) {
  target.authconfig = authconfig;
};
