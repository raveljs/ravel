'use strict';

/**
 * Factory for the TokenAuthenticater class, taking a reference to a Ravel app.
 *
 * @param {Ravel} ravelInstance - A Ravel app.
 * @private
 */
module.exports = function (ravelInstance) {
  /**
   * Validates a user-supplied OAuth 2.0 token in the x-auth-token header
   * and transforms it into a user profile.
   *
   * This token must have been obtained using scopes which yield at least
   * the basic user profile (name, etc.) and email address.
   *
   * The token is verified with the appropriate auth provider,
   * and then used to look up a user profile via the provider's base API.
   * The result of this verification and lookup is cached in Redis for the
   * duration of the validity of the token, so that subsequent lookups with
   * the same token are faster.
   *
   * Auth providers may handle multiple client types, such as google-oauth2-ios,
   * google-oauth2-android and google-oauth2-web.
   *
   * @private
   */
  class TokenAuthenticater {
    static credentialToProfile (token, client) {
      return new Promise((resolve, reject) => {
        const providers = ravelInstance.authenticationProviders();
        const provider = providers.filter(p => p.handlesClient(client));
        if (provider.length > 0) {
          const profileCacheKey = `${provider[0].name}-${client}-profile-${token}`;
          ravelInstance.$kvstore.get(profileCacheKey,
            function (err, profileString) {
              if (err || !profileString) {
                provider[0].credentialToProfile(token, client)
                  .then((result) => {
                    ravelInstance.$kvstore.setex(profileCacheKey, result.expiry, JSON.stringify(result.profile));
                    resolve(result.profile);
                  })
                  .catch(reject);
              } else {
                resolve(JSON.parse(profileString));
              }
            });
        } else {
          reject(new ravelInstance.$err.NotFound(
            'No registered authentication providers handle client type ' + client), null);
        }
      });
    }
  }

  return TokenAuthenticater;
};
