'use strict';

/**
 * Encapsulates the configuration of passport.js callbacks
 */

const ApplicationError = require('../util/application_error');

const symbols = require('./symbols');

function authconfig(target) {
  Object.defineProperty(target.prototype, symbols.authconfig, {
    get: function () { return true; }
  });

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

module.exports = function(Ravel) {
  Ravel.authconfig = authconfig;
};
