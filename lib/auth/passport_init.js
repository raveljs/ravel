'use strict';

const passport = require('koa-passport');
const ApplicationError = require('../util/application_error');
const symbols = require('./symbols');
const coreSymbols = require('../core/symbols');

/**
 * Encapsulates the initialization of passport.js
 */
module.exports = function(ravelInstance) {

  /**
   * Retrieve the first registered Module which is decorated with &#64;authconfig
   * @return the first &#64;authconfig Module
   */
  function getAuthMod() {
    let authMod = null;
    for (let m of Object.keys(ravelInstance[coreSymbols.modules])) {
      if (ravelInstance[coreSymbols.modules][m][symbols.authconfig]) {
        authMod = ravelInstance[coreSymbols.modules][m];
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
   */
  ravelInstance.once('post config koa', function(app) {
    const providers = ravelInstance.get('authorization providers');

    if (providers.length > 0) {
      ravelInstance[symbols.authConfigModule] = getAuthMod();

      app.use(passport.initialize());
      app.use(passport.session());

      passport.serializeUser(function(user, done) {
        //console.log("serializeUser: " + JSON.stringify(user));
        done(null, user.id);
      });

      passport.deserializeUser(function(userId, done) {
        ravelInstance[symbols.authConfigModule].getUser(userId)
        .then((user) => {
          done(null, user);
        }).catch((err) => {
          done(err, null);
        });
      });

      const getOrCreate = function(accessToken, refreshToken, profile, done) {
        ravelInstance[symbols.authConfigModule].getOrCreateUser(
          accessToken,
          refreshToken,
          profile)
        .then((user) => {
          done(null, user);
        }).catch((err) => {
          done(err, null);
        });
      };
      for (let p of providers) {
        p.init(app, passport, getOrCreate);
      }
    }
  });
};
