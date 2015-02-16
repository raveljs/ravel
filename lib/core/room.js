'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Allows clients to define websocket rooms, which take
 * an authorization function. Rooms are structured as
 * paths with optional path parameters which, if present,
 * are supplied to the authorization function. Thus
 * this module can actually be used to define groups of
 * rooms which share a common path structure.
 */

var path = require('path');

module.exports = function(Ravel, rooms) {
   /**
   * Registers a websocket room, with a given authorization function and context
   *
   * @param {String} roomPattern the name of the websocket room
   * @param {Function} authorizationFunction, of the form function(userId, callback(err, {Boolean}authorized))
   */
  Ravel.room = function(roomPattern, authorizationFunction) {
    roomPattern = path.normalize(roomPattern);
    //if a room with this name has already been regsitered, error out
    if (rooms[roomPattern]) {
      throw new Ravel.ApplicationError.DuplicateEntry(
        'Websocket room with path \'' + roomPattern + '\' has already been registered.');
    } else if (typeof authorizationFunction !== 'function') {
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
      authorize: authorizationFunction
    };
    Ravel.Log.info('Creating websocket room with pattern ' + roomPattern);
  };
 };
