'use strict';

/**
 * Encapsulates the initialization of passport.js
 */
var passport = require('passport');

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

  Ravel.once('post config express', function(expressApp) {
    var providers = Ravel.get('authorization providers');
    if (providers.length > 0) {
      expressApp.use(passport.initialize());
      expressApp.use(passport.session());
      Ravel.authorize = require('./authorize_request')(Ravel, false, true);
      Ravel.authorizeWithRedirect = require('./authorize_request')(Ravel, true, true);

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

      var getOrCreate = function(accessToken, refreshToken, profile, done) {
        injector.inject({
          'accessToken':accessToken,
          'refreshToken':refreshToken?refreshToken:null,
          'profile':profile,
          'done':done,
          '$ScopedTransaction': Ravel.db.scoped
        }, Ravel.get('get or create user function'));
      };
      for (var i=0;i<providers.length;i++) {
        providers[i].init(
          expressApp,
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
