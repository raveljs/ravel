'use strict';

/**
 * Allows clients to define websocket rooms, which take
 * an authorization function. Rooms are structured as
 * paths with optional path parameters which, if present,
 * are supplied to the authorization function. Thus
 * this module can actually be used to define groups of
 * rooms which share a common path structure.
 */

var path = require('path');

module.exports = function(Ravel, rooms) {
  var defaultAuthorizationFunction = function(userId, callback) {
    callback(null, true);
  };

   /**
   * Registers a websocket room, with a given authorization function and context
   *
   * @param {String} roomPattern the name of the websocket room
   * @param {Function} authorizationFunction, supporting DI, of the form
   *                   function(userId, params, $ScopedTransaction, module1, ..., done(err, {Boolean}authorized))
   *                   @param userId {String | Number} The id of the user
   *                   @param params {Array} An array of path parameter values extracted from the specific room
   *                                         (matching the room pattern) the user is trying to join.
   *                   @param $ScopedTransaction {Function} See db/database
   *                   @param module1 {Object} Modules, either client-defined or via npm
   *                   @param done {Function} callback(err, {Boolean}) to indicate the user is authorized or not
   *                   Note that parameters userId, params and done must have
   *                   those exact names in the supplied authorizationFunction
   */
  Ravel.room = function(roomPattern, authorizationFunction) {
    roomPattern = path.normalize(roomPattern);
    //if a room with this name has already been regsitered, error out
    if (rooms[roomPattern]) {
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Websocket room with path \'' + roomPattern + '\' has already been registered.');
    } else if (authorizationFunction !== undefined && typeof authorizationFunction !== 'function') {
      throw new Ravel.ApplicationError.IllegalValue(
        'Authorization function for path \'' + roomPattern + '\' must be a function.');
    }
    var params = [];
    var paramMatcher = new RegExp(/\:(\w+)/g);
    var paramMatch = paramMatcher.exec(roomPattern);
    while (paramMatch !== null) {
      params.push(paramMatch[1]);
      paramMatch = paramMatcher.exec(roomPattern);
    }
    rooms[roomPattern] = {
      name: roomPattern,
      params: params,
      regex: new RegExp(roomPattern.replace(/\:(\w+)/g,'(\\w+)')),
      authorize: authorizationFunction !== undefined ? authorizationFunction : defaultAuthorizationFunction
    };
    Ravel.Log.info('Creating websocket room with pattern ' + roomPattern);
  };
 };
