'use strict';

/**
 * Initializes primus sparks with a room subscription event
 */

module.exports = function(
  Ravel,
  injector,
  spark,
  RoomResolver,
  broadcast,
  getUserId,
  getRoomKey,
  getUserKey) {

  //room connection
  spark.on('subscribe', function(data, callback) {
    if (!data.room || typeof data.room !== 'string') {
      callback(new Ravel.ApplicationError.IllegalValue(
        'subscribe websocket message must contain \'room\' string property'), null);
      return;
    }
    //try to resolve room string against list of registered room patterns
    const resolvedRoom = RoomResolver.resolve(data.room);
    if (!resolvedRoom) {
      callback(new Ravel.ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);
      return;
    } else {
      //use client-supplied authorization function
      getUserId(spark, function(err, userId) {
        if (err) {
          callback(err, null);
        } else {
          const done = function(err, result) {
            if (err || !result) {
              callback(new Ravel.ApplicationError.Access('User id=' + userId +
                ' is not authorized to connect to room ' + data.room), null);
            } else {
              //user is authorized to connect to room
              spark.join(resolvedRoom.instance, function() {
                //store new room member in kvstore
                Ravel.kvstore.sadd(getRoomKey(resolvedRoom.instance), userId);
                //store new room in user's connected room list
                Ravel.kvstore.sadd(getUserKey(userId), resolvedRoom.instance);
                //if the user supplied a last disconnection timestamp,
                //grab all the messages they missed since then
                if (data.lastDisconnectTime) {
                  broadcast.getMissedMessages(
                    resolvedRoom.instance, data.lastDisconnectTime, function(err, messages) {
                      callback(null, messages);
                  });
                } else {
                  //done
                  callback(null,true);
                }
                //let everyone know the user connected
                Ravel.Log.debug('user id=' + userId + ' joined room ' + resolvedRoom.instance);
                broadcast.emit(
                  resolvedRoom.instance,
                  'user connected',
                  {userId:userId},
                  true
                );
              });
            }
          };
          injector.inject({
            'userId':userId,
            'params': resolvedRoom.params,
            'done': done,
            '$ScopedTransaction': Ravel.db.scoped
          }, resolvedRoom.room.authorize);
        }
      });
    }
  });
};
