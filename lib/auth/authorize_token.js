'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Validates a user-supplied OAuth 2.0 token in the x-auth-token header
 * and transforms it into a user profile
 * This token must have been obtained using at least the following two scopes:
 * - https://www.googleapis.com/auth/userinfo.profile
 * - https://www.googleapis.com/auth/userinfo.email
 * The token is verified with google, and then used to look up a user profile
 * using Google APIs. The result of this verification and lookup is
 * cached in Redis for the duration of the validity of the token, so that
 * subsequent lookups with the same token are faster.
 *
 * Non-web clients must also identify their type using an x-auth-client header
 * which can currently assume the following values:
 * - 'ios' (for an iOS device)
 * - 'web' (for a web browser)
 */
 
module.exports = function(Ravel) {

  var providers = Ravel.get('authorization providers');

  //transforms a token into a passport.js-compatible profile
  var tokenToProfile = function(token, client, callback) {
    /*jshint loopfunc: true */
    for (var i=0;i<providers.length;i++) {
      if (providers[i].handlesClient(client)) {
        var profileCacheKey = providers[i].name+'-'+client+'-profile-'+token;
        Ravel.kvstore.get(profileCacheKey, function(err, profileString) {
          if (err || !profileString) {
            providers[i].tokenToProfile(token, client, function(err, profile, expiry) {              
              //cache profile in redis, and expire the record based 
              //on the token expiry. This will help mitigate rapid,
              //subsequent requests.
              Ravel.kvstore.setex(profileCacheKey, expiry, JSON.stringify(profile));
              callback(null, profile);
            });
          } else {
            callback(null, JSON.parse(profileString));
          }
        });
        break;
      }
    }
  };

  return {
    tokenToProfile: tokenToProfile
  };
};
