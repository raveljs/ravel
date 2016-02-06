'use strict';

/**
 * Encapsulates the initialization of passport.js
 * TODO convert to work with koa
 */
const passport = require('passport');

module.exports = function(Ravel, injector) {
  //Passport parameters
  Ravel.registerSimpleParameter('app route', false);
  Ravel.set('app route', '/');
  Ravel.registerSimpleParameter('login route', false);
  Ravel.set('login route', '/login');
  Ravel.registerSimpleParameter('get user function', false);
  Ravel.set('get user function', function() {
    throw new Ravel.ApplicationError.NotImplemented(
      'An authorization provider was specified, but no \'get user function\' is defined.');
  });
  Ravel.registerSimpleParameter('get or create user function', false);
  Ravel.set('get or create user function', function() {
    throw new Ravel.ApplicationError.NotImplemented(
      'An authorization provider was specified, but no \'get or create user function\' is defined.');
  });

  Ravel.once('post config koa', function(koaApp) {
    const providers = Ravel.get('authorization providers');
    if (providers.length > 0) {
      koaApp.use(passport.initialize());
      koaApp.use(passport.session());
      Ravel.authorize = require('./authorize_request')(Ravel, false, true); //TODO convert to koa middleware
      Ravel.authorizeWithRedirect = require('./authorize_request')(Ravel, true, true); //TODO convert to koa middleware

      passport.serializeUser(function(user, done) {
        //console.log("serializeUser: " + JSON.stringify(user));
        done(null, user.id);
      });

      passport.deserializeUser(function(userId, done) {
        injector.inject({
          'userId':userId,
          'done': done,
          '$ScopedTransaction': Ravel.db.scoped
        }, Ravel.get('get user function'));
      });

      const getOrCreate = function(accessToken, refreshToken, profile, done) {
        injector.inject({
          'accessToken':accessToken,
          'refreshToken':refreshToken?refreshToken:null,
          'profile':profile,
          'done':done,
          '$ScopedTransaction': Ravel.db.scoped
        }, Ravel.get('get or create user function'));
      };
      for (let i=0;i<providers.length;i++) {
        providers[i].init(
          koaApp,
          passport,
          getOrCreate);
      }
    } else {
      Ravel.authorize = function() {
        throw new Ravel.ApplicationError.NotImplemented(
          'Attempted to use $Private without an authorization provider.');
      };
      Ravel.authorizeWithRedirect = function() {
        throw new Ravel.ApplicationError.NotImplemented(
          'Attempted to use $PrivateRedirect without an authorization provider.');
      };
    }
  });
};
