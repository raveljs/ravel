'use strict';

/**
 * Initializes primus with an authorization function,
 * and returns that function for use elsewhere.
 */
module.exports = function(Ravel, injector, primus, expressSessionStore) {
  var cookieParser = require('cookie-parser')(Ravel.get('express session secret'));

  var tokenAuth = require('../auth/authorize_token')(Ravel);

  //Primus authorization - only allow users with
  //valid sessions or oauth bearer tokens to
  //connect to primus. Very similar to code in authorize_request.js
  var authorize = function(req, callback) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      tokenAuth.tokenToProfile(req.headers['x-auth-token'], req.headers['x-auth-client'], function(err, profile) {
        if (err) {
          Ravel.Log.error('User not authorized to connect to primus');
          callback(err, false);
        } else {
          Ravel.get('get user function')(Ravel, profile, function(err, user) {
            if (err) {
              Ravel.Log.error(err);
              callback(err, false);
            } else {
              Ravel.Log.debug('User id=' + user.id + ' authorized to connect to primus via OAuth2.0 bearer token');
              callback(null, user.id);
            }
          });
        }
      });
    } else {
      var cookie;
      cookieParser(req, {}, function(err) {
        if (err) {throw err;}
        cookie = req.signedCookies;
      });
      expressSessionStore.get(cookie['connect.sid'], function(err, session) {
        //session.passport.user is actually a user id
        if(!err && session && session.passport && session.passport.user) {
          Ravel.Log.debug('User id=' + session.passport.user + ' authorized to connect to primus');
          callback(null, session.passport.user);
        } else {
          Ravel.Log.error('User not authorized to connect to primus');
          callback(err, false);
        }
      });
    }
  };
  primus.authorize(authorize);
  return authorize;
};
