'use strict';

/**
 * Initializes primus sparks with a room unsubscription event
 */

module.exports = function(
  Ravel,
  spark,
  RoomResolver,
  broadcast,
  getUserId,
  getRoomKey,
  getUserKey) {

  //room disconnection
  spark.on('unsubscribe', function(data, callback) {
    if (!data.room || typeof data.room !== 'string') {
      callback(new Ravel.ApplicationError.IllegalValue(
        'unsubscribe websocket message must contain \'room\' string property'), null);
      return;
    }
    var resolvedRoom = RoomResolver.resolve(data.room);
    if (!resolvedRoom) {
      callback(new Ravel.ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);
    } else {
      getUserId(spark, function(err, userId) {
        if (err || !userId) {
          callback(err, null);
        } else {
          spark.leave(resolvedRoom.instance, function() {
            //remove disconnected user from room's kvstore cache
            Ravel.kvstore.srem(getRoomKey(resolvedRoom.instance), userId);
            //remove room from user's connected room kvstore cache
            Ravel.kvstore.srem(getUserKey(userId), resolvedRoom.instance);
            //callback immediately, we can do more cleanup after
            callback(null, true);
            //let everyone know
            Ravel.Log.debug('user id=' + userId + ' left room ' + resolvedRoom.instance);
            broadcast.emit(
              resolvedRoom.instance,
              'user disconnected',
              {userId:userId},
              true
            );
          });
        }
      });
    }
  });
};
