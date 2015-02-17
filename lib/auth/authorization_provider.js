'use strict';

/**
 * Defines an abstract AuthorizationProvider - a module
 * which is capable of initializing Passport.js with
 * a particular OAuth2 strategy, and seamlessly verifying
 * requests issued by mobile clients via OAuth2 tokens
 * instead of sessions.
 */
module.exports = function(Ravel) {
  Ravel.AuthorizationProvider = function(name) {
    /**
     * The name of the AuthorizationProvider
     */
    this.name = name;

    /**
     * Initialize passport.js with a strategy
     *
     * @param expressApp {Object} An express application object
     * @param passport {Object} A passport.js object
     * @param verify {Function} See passport.js Strategy verify callback.
     *                          Just pass this to the strategy you create
     *                          and activate via passport.use.
     */
    this.init = function() {
      throw new Ravel.ApplicationError.NotImplemented(
        'AuthorizationProvider ' + this.name + ' must implement init(expressApp, passport, verify)');
    };

    /**
     * Does this authorization provider handle the given client type
     *
     * @param client {String} A client type, such as google-oauth2-ios
     * @return {Boolean} true iff this provider handles the given client
     */
    this.handlesClient = function() {
      throw new Ravel.ApplicationError.NotImplemented(
        'AuthorizationProvider ' + this.name + ' must implement handlesClient(client)');
    };


    /**
     * Transform an OAuth2 token into a user profile, iff the
     * token is valid for this application.
     *
     * @param token {String} An OAuth2 user token
     * @param client {String}  A client type, such as google-oauth2-ios
     * @param callback {Function} Node.js callback(err, profile, expiry)
     */
    this.tokenToProfile = function() {
      throw new Ravel.ApplicationError.NotImplemented(
        'AuthorizationProvider ' + this.name + ' must implement tokenToProfile(token, client, callback)');
    };

    return this;
  };
};
