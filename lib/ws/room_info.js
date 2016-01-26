'use strict';

/**
 * Initializes primus sparks with a room info events
 */

module.exports = function(
  Ravel,
  spark,
  RoomResolver,
  broadcast,
  getUserId,
  getRoomKey) {

  //get users connected to a room
  spark.on('get connected users', function(data, callback) {
    if (!data.room || typeof data.room !== 'string') {
      callback(new Ravel.ApplicationError.IllegalValue(
        'unsubscribe websocket message must contain \'room\' string property'), null);
      return;
    }
    const resolvedRoom = RoomResolver.resolve(data.room);
    if (!resolvedRoom) {
      callback(new Ravel.ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);
    } else {
      getUserId(spark, function(err, userId) {
        if (err || !userId) {
          callback(err, null);
        } else if (!Ravel.kvstore.sismember(getRoomKey(resolvedRoom.instance), userId)) {
          callback(new Ravel.ApplicationError.Access(
            'User outside of room \'' + resolvedRoom.instance + '\' requested connected users.'), null);
        } else {
          Ravel.kvstore.smembers(getRoomKey(resolvedRoom.instance), callback);
        }
      });
    }
  });
};
