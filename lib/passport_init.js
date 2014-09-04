'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports = function(Ravel, injector, passport) {
  passport.serializeUser(function(user, done) {
    //console.log("serializeUser: " + JSON.stringify(user));
    done(null, user.id);
  });

  passport.deserializeUser(function(userId, done) {
    injector.inject({
      'userId':userId,
      'done': done,
      '$Transaction': Ravel.db.transactionCreator
    }, Ravel.get('get user function'));
  });

  passport.use(new GoogleStrategy({
      //https://cloud.google.com/console/project/1084472114850/apiui/credential
      //https://developers.google.com/+/web/signin/server-side-flow <- Super important
      clientID:Ravel.get('google oauth2 web client id'),
      clientSecret:Ravel.get('google oauth2 web client secret'),
      callbackURL: 'http://' + Ravel.get('app domain') +':' + Ravel.get('app port') + '/auth/google/return'
    },
    function(accessToken, refreshToken, profile, done) {
      injector.inject({
        'accessToken':accessToken,
        'refreshToken':refreshToken,
        'profile':profile,
        'done':done,
        '$Transaction': Ravel.db.transactionCreator
      }, Ravel.get('get or create user function'));
    }
  ));
};
