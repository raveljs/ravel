'use strict';

const ApplicationError = require('../util/application_error');
const Metadata = require('../util/meta');

/**
 * &#64;authconfig
 *
 * A decorator for a module, indicating that it will offer
 * specific functions which encapsulate the configuration
 * of passport.js.
 */
function authconfig(target) {
  Metadata.putClassMeta(target.prototype, '@authconfig', 'enabled', true);

  if (!target.prototype.getUser) {
    target.prototype.getUser = function(userId) { //eslint-disable-line no-unused-vars
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authorization provider was specified, but no PassportConfig was ' +
        'supplied with an implemented getUser()'));
    };
  }
  if (!target.prototype.getOrCreateUser) {
    target.prototype.getOrCreateUser = function(
      accessToken,
      refreshToken,
      profile //eslint-disable-line no-unused-vars
    ) {
      return Promise.reject(new ApplicationError.NotImplemented(
        'An authorization provider was specified, but no PassportConfig was ' +
        'supplied with an implemented getOrCreateUser()'));
    };
  }
};

/**
 * Export function which adds the authconfig decorator as a static property of any class
 */
module.exports = function(target) {
  target.authconfig = authconfig;
};
