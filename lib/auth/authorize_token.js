'use strict';

/**
 * Validates a user-supplied OAuth 2.0 token in the x-auth-token header
 * and transforms it into a user profile
 * This token must have been obtained using scopes which yield at least
 * the basic user profile (name, etc.) and email address
 *
 * The token is verified with the appropriate auth provider,
 * and then used to look up a user profile via the provider's base API.
 * The result of this verification and lookup is cached in Redis for the
 * duration of the validity of the token, so that subsequent lookups with
 * the same token are faster.
 *
 * Auth providers may handle multiple client types, such as google-oauth2-ios,
 * google-oauth2-android and google-oauth2-web
 */

module.exports = function(Ravel) {

  const providers = Ravel.get('authorization providers');

  //transforms a token into a passport.js-compatible profile
  const tokenToProfile = function(token, client, callback) {
    let foundHandler = false;
    for (let i=0;i<providers.length;i++) {
      if (providers[i].handlesClient(client)) {
        foundHandler = true;
        const profileCacheKey = providers[i].name+'-'+client+'-profile-'+token;
        Ravel.kvstore.get(profileCacheKey, function(err, profileString) { //eslint-disable-line no-loop-func
          if (err || !profileString) {
            providers[i].tokenToProfile(token, client, function(err2, profile, expiry) {
              if (err2) {
                //cache profile in redis, and expire the record based
                //on the token expiry. This will help mitigate rapid,
                //subsequent requests.
                callback(err2, null);
              } else {
                Ravel.kvstore.setex(profileCacheKey, expiry, JSON.stringify(profile));
                callback(null, profile);
              }
            });
          } else {
            callback(null, JSON.parse(profileString));
          }
        });
        break;
      }
    }
    if (!foundHandler) {
      callback(new Ravel.ApplicationError.NotFound(
        'No registered authorization providers handle client type ' + client), null);
    }
  };

  return {
    tokenToProfile: tokenToProfile
  };
};
