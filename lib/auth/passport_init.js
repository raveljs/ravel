'use strict';

const passport = require('koa-passport');
const koaConvert = require('koa-convert');
const ApplicationError = require('../util/application_error');
const Metadata = require('../util/meta');
const symbols = require('./symbols');
const coreSymbols = require('../core/symbols');

/**
 * Encapsulates the initialization of passport.js.
 *
 * @param {Ravel} ravelInstance - A reference to an instance of a Ravel app.
 * @param {Object} router - A koa router.
 * @private
 */
module.exports = function (ravelInstance, router) {
  /**
   * Retrieve the first registered Module which is decorated with `@authconfig`.
   *
   * @returns {Object} The first `@authconfig` `Module`.
   * @private
   */
  function getAuthMod () {
    let authMod = null;
    for (const m of Object.keys(ravelInstance[coreSymbols.modules])) {
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
   * @private
   */
  ravelInstance.once('post config koa', function (app) {
    const providers = ravelInstance.authenticationProviders();

    if (providers.length > 0) {
      app.use(koaConvert(passport.initialize()));
      app.use(koaConvert(passport.session()));
      app.use(async function (ctx, next) {
        // overwrite ctx.passport with deprecation message
        Object.defineProperty(ctx, 'passport', {
          configurable: true,
          get: () => {
            ravelInstance.log.warn('ctx.passport is deprecated. Please use ctx.state instead.');
            return ctx.state;
          }
        });
        await next();
      });
    }
  });

  /**
   * @private
   */
  ravelInstance.once('post module init', function () {
    const providers = ravelInstance.authenticationProviders();

    if (providers.length > 0) {
      ravelInstance[symbols.authConfigModule] = getAuthMod();

      passport.serializeUser(function (user, done) {
        ravelInstance[symbols.authConfigModule].serializeUser(user)
        .then((id) => {
          done(null, id);
        }).catch((err) => {
          done(err, null);
        });
      });

      passport.deserializeUser(function (userId, done) {
        ravelInstance[symbols.authConfigModule].deserializeUser(userId)
        .then((user) => {
          done(null, user);
        }).catch((err) => {
          done(err, null);
        });
      });

      const verify = function (providerName) {
        return function (...verifyArgs) {
          const done = verifyArgs[verifyArgs.length - 1];
          const args = verifyArgs.slice(0, verifyArgs.length - 1);
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
      for (const p of providers) {
        p.init(router, passport, verify(p.name));
      }
    }
  });
};
