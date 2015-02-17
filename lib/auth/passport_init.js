'use strict';

/**
 * Encapsulates the initialization of passport.js
 */

module.exports = function(Ravel, expressApp, injector, passport) {

  var providers = Ravel.get('authorization providers');
  if (providers.length === 0) {
    throw new Ravel.ApplicationError.IllegalValue('Unable to start application. No authorization provider specified!');
  }

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
};
