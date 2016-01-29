'use strict';

/**
 * Handles primus disconnections, disconnecting clients from rooms cleanly.
 */
module.exports = function(Ravel, primus, broadcast, getUserId, getUserKey, getRoomKey) {
  primus.on('disconnection', function(spark) {

    getUserId(spark, function(err, userId) {
      if (err || !userId) {return;}

      function leaveRoom(room) {
        spark.leave(room, function() {
          //remove disconnected user from room's kvstore cache
          Ravel.kvstore.srem(getRoomKey(room), userId);
          //let everyone know
          Ravel.Log.debug('user id=' + userId + ' left room ' + room);
          broadcast.emit(
            room,
            'user disconnected',
            {userId:userId},
            true
          );
        });
      }

      //disconnect user from all rooms they're in
      //(so that other users get a clean disconnect message even
      //if this user just lost power or closed the tab)
      Ravel.kvstore.smembers(getUserKey(userId), function(err2, connectedRooms) {
        for (let i=0;i<connectedRooms.length;i++) {
          leaveRoom(connectedRooms[i]);
        }
        //empty user list of connected rooms
        Ravel.kvstore.del(getUserKey(userId));
      });
    });
  });
};
