/**
 * Tapestry
 * Copyright (c) 2013 Sean McIntyre <s.mcintyre@xverba.ca>
 */

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

module.exports = function(Ravel, passport) {
  passport.serializeUser(function(user, done) {
    //console.log("serializeUser: " + JSON.stringify(user));
    done(null, user.id);
  });

  passport.deserializeUser(Ravel.get('get user function')(Ravel, obj, done));

  passport.use(new GoogleStrategy({
      //https://cloud.google.com/console/project/1084472114850/apiui/credential
      //https://developers.google.com/+/web/signin/server-side-flow <- Super important
      clientID:process.env.GOOGLE_WEB_CLIENT_ID,
      clientSecret:process.env.GOOGLE_WEB_CLIENT_SECRET,
      callbackURL: 'http://' + app.get('app domain') +':' + app.get('app port') + '/auth/google/return'
    },
    Ravel.get('get or create user function')(Ravel, accessToken, refreshToken, profile, done)
  ));
};
