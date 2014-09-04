'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Validates a user-supplied OAuth 2.0 Bearer token in the x-auth-token header
 * and transforms it into a user profile
 * This Bearer token must have been obtained using at least the following two scopes:
 * - https://www.googleapis.com/auth/userinfo.profile
 * - https://www.googleapis.com/auth/userinfo.email
 * The token is verified with google, and then used to look up a user profile
 * using Google APIs. The result of this verification and lookup is
 * cached in Redis for the duration of the validity of the bearer token, so that
 * subsequent lookups with the same bearer token are faster.
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * which can currently assume the following values:
 * - 'ios' (for an iOS device)
 * - 'web' (for a web browser)
 */
 
var l = require('./log.js')('authorize_bearer_token');
var https = require('https');
 
module.exports = function(Ravel) {

  //transforms a bearer token into a Google OAuth2.0 profile
  var bearerToProfile = function(bearerToken, client, callback) {
    var profileCacheKey = 'google-bearer-'+client+'-profile-'+bearerToken;
    //see if we've already validated this bearer token and cached the result
    Ravel.kvstore.get(profileCacheKey, function(err, profileString) {
      if (err || !profileString) {
        validateBearer(bearerToken, client, function(err, validity) {
          if (err) {
            callback(err, null);
          } else if (!validity){
            callback(new Error('Unable to retrieve profile using an invalid OAuth token=' + bearerToken + ' for client \'' + client + '\''), null);
          } else {
            //token is valid!
            //use Google APIs to retrieve user profile
            //using given token. Token MUST have been requested with the
            //following scopes:
            //- https://www.googleapis.com/auth/userinfo.profile 
            //- https://www.googleapis.com/auth/userinfo.email
            https.get({
                hostname:'www.googleapis.com',
                path:'/plus/v1/people/me/openIdConnect',
                headers: {
                    'Authorization':'Bearer ' + bearerToken
                }
            }, function(res) {
                var data = '';
                res.on('data', function(chunk) {
                    data+=chunk;
                });
                res.on('end', function() {
                    var obj = JSON.parse(data);
                    if (res.statusCode > 200 || obj['error']) {
                        var message = 'Could not translate valid Google OAuth token=' + bearerToken + ' into OAuth profile for client \'' + client + '\'';
                        l.e(message);
                        l.e(obj);
                        callback(new Error(message), null);
                    } else {
                        var profile = {
                            displayName:obj.name,
                            emails:obj['email_verified'] ? [obj['email']] : [],
                            name: {givenName:obj['given_name'], familyName:obj['family_name']},
                            _json:{picture:obj['picture']}
                        };
                        //cache profile from google in redis, and expire the record
                        //based on the token expiry. This will help mitigate rapid,
                        //subsequent requests.
                        Ravel.kvstore.setex(profileCacheKey, validity['expires_in'], JSON.stringify(profile));
                        callback(null, profile);
                    }
                });
            });
          }
        });
      } else {
        callback(null, JSON.parse(profileString));
      }
    });
  };
  
  //Validates a bearer token and caches the result until that token's
  //expire time.
  //TODO do this locally instead of calling googleapis https://developers.google.com/accounts/docs/OAuth2Login#validatinganidtoken
  var validateBearer = function(bearerToken, client, callback) {
    var validityCacheKey = 'google-bearer-'+client+'-validity'+bearerToken;
    //see if we've already validated this bearer token and cached the result
    Ravel.kvstore.get(validityCacheKey, function(err, validityString) {
      if (err || !validityString) {
        //mobile API auth based on google OAuth2 token supplied by client
        //we need to determine who the client is, and map that to a profile 
        //https://developers.google.com/accounts/docs/OAuth2UserAgent#validatetoken
        //http://android-developers.blogspot.ca/2013/01/verifying-back-end-calls-from-android.html
        https.get('https://www.googleapis.com/oauth2/v1/tokeninfo?scope=https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email+&access_token='+bearerToken, function(res) {
          var data = '';        
          res.on('data', function(chunk) {
            data+=chunk;
          });
          res.on('end', function() {
            var obj = JSON.parse(data);
            var audience;
            switch(client) {
              case 'ios':
                audience = Ravel.get('google oauth2 ios client id');
                break;
              case 'android':
                audience = Ravel.get('google oauth2 android client id');
                break;
              case 'web':
                /* falls through */
              default:
                audience = Ravel.get('google oauth2 web client id');
                break;
            }
            var message;
            if (res.statusCode > 200 || obj['error']) {
              message = 'Client attempted to access API with an invalid OAuth token=' + bearerToken + ' for client \'' + client + '\'';
              l.e(message);
              callback(new Error(message), null);
            } else if (obj['audience'] !== String(audience)) {
              message = 'Client attempted to access API with a valid OAuth token=' + bearerToken + ' against client \'' + client + '\', but it is registered to a different application client';
              l.e(message);
              callback(new Error(message), null);
            } else if (obj['user_id']) {
              Ravel.kvstore.setex(validityCacheKey, obj['expires_in'], data);
              //allow bypass!
              callback(null, obj);
            } else {
              message = 'Could not translate valid Google OAuth token=' + bearerToken + ' into Google client id.';
              l.e(message);
              l.e(obj);
              callback(new Error(message), null);
            }
          });
        });
      } else {
        //allow bypass!
        callback(null, JSON.parse(validityString));
      }
    });
  };

  return {
    bearerToProfile: bearerToProfile,    
    validateBearer: validateBearer
  };
};
