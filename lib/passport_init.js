/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports = function(Ravel, passport) {
  passport.serializeUser(function(user, done) {
    //console.log("serializeUser: " + JSON.stringify(user));
    done(null, user.id);
  });

  passport.deserializeUser(function(userId, done) {
    Ravel.get('get user function')(userId, done);
  });

  passport.use(new GoogleStrategy({
      //https://cloud.google.com/console/project/1084472114850/apiui/credential
      //https://developers.google.com/+/web/signin/server-side-flow <- Super important
      clientID:Ravel.get('google oauth2 web client id'),
      clientSecret:Ravel.get('google oauth2 web client secret'),
      callbackURL: 'http://' + Ravel.get('app domain') +':' + Ravel.get('app port') + '/auth/google/return'
    },
    function(accessToken, refreshToken, profile, done) {
      Ravel.get('get or create user function')(accessToken, refreshToken, profile, done)
    }
  ));
};
