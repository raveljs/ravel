'use strict';

const passport = require('koa-passport');
const ApplicationError = require('../util/application_error');
const Metadata = require('../util/meta');
const symbols = require('./symbols');
const coreSymbols = require('../core/symbols');

/**
 * Encapsulates the initialization of passport.js
 * @api private
 */
module.exports = function(ravelInstance, router) {

  /**
   * Retrieve the first registered Module which is decorated with &#64;authconfig
   * @return the first &#64;authconfig Module
   * @api private
   */
  function getAuthMod() {
    let authMod = null;
    for (let m of Object.keys(ravelInstance[coreSymbols.modules])) {
      const mod = ravelInstance[coreSymbols.modules][m];
      if (Metadata.getClassMetaValue(Object.getPrototypeOf(mod), '@authconfig', 'enabled', false)) {
        authMod = mod;
        break;
      } else {
        continue;
      }
    }
    if (authMod === null) {
      throw new ApplicationError.NotFound('Module annotated with @authconfig is required and was not found.');
    }

    return authMod;
  }

  /**
   * Using the 'post config koa' hook, initalize passport using a reference to the internal koa app
   * @api private
   */
  ravelInstance.once('post config koa', function(app) {
    const providers = ravelInstance.get('authentication providers');

    if (providers.length > 0) {
      app.use(passport.initialize());
      app.use(passport.session());
    }
  });

  /**
   * @api private
   */
  ravelInstance.once('post module init', function() {
    const providers = ravelInstance.get('authentication providers');

    if (providers.length > 0) {
      ravelInstance[symbols.authConfigModule] = getAuthMod();

      passport.serializeUser(function(user, done) {
        ravelInstance[symbols.authConfigModule].serializeUser(user)
        .then((id) => {
          done(null, id);
        }).catch((err) => {
          done(err, null);
        });
      });

      passport.deserializeUser(function(userId, done) {
        ravelInstance[symbols.authConfigModule].deserializeUser(userId)
        .then((user) => {
          done(null, user);
        }).catch((err) => {
          done(err, null);
        });
      });

      const verify = function(providerName) {
        return function(...verifyArgs) {
          const done = verifyArgs[verifyArgs.length-1];
          const args = verifyArgs.slice(0,verifyArgs.length-1);
          // add provider name to the argument list for verify(),
          // so that @authconfig module can make different decisions
          // for different providers.
          args.unshift(providerName);
          ravelInstance[symbols.authConfigModule].verify(...args)
          .then((user) => {
            done(null, user);
          }).catch((err) => {
            done(err, null);
          });
        };
      };
      for (let p of providers) {
        p.init(router, passport, verify(p.name));
      }
    }
  });
};
