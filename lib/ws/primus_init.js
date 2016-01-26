'use strict';

/**
 * Initializes primus, handles client room joining/leaving, and
 * receives/handles all client events which have callbacks
 * (via primus-emitter in primus.io). These callbacks are always to a SINGLE
 * client (spark), and not a broadcast. All broadcasts are handled by
 * the cluster-compatible broadcast.js library.
 */

module.exports = function(Ravel, injector, primus, expressSessionStore, RoomResolver) {

  const broadcast = require('../ws/util/broadcast')(Ravel, primus, RoomResolver);

  const getRoomKey = function(room) {
    return 'ws_room:' + room;
  };
  const getUserKey = function(user) {
    return 'ws_user:' + user;
  };

  const authorize = require('./authorize')(Ravel, injector, primus, expressSessionStore);

  //retrieves a user id from a spark
  const getUserId = function(spark, callback) {
    if (spark.userId) {
      callback(null, spark.userId);
    } else {
      authorize({headers:spark.headers},function(err, userId) {
        if (err) {
          callback(err, null);
        } else {
          //cache user id in their spark
          spark.userId = userId;
          callback(null, userId);
        }
      });
    }
  };

  primus.on('connection', function connection(spark) {

    require('./subscribe')(
      Ravel, injector, spark, RoomResolver, broadcast, getUserId, getRoomKey, getUserKey);

    require('./unsubscribe')(
      Ravel, spark, RoomResolver, broadcast, getUserId, getRoomKey, getUserKey);

    require('./room_info')(
      Ravel, spark, RoomResolver, broadcast, getUserId, getRoomKey);

    require('./emit')(
      Ravel, spark, RoomResolver, broadcast, getUserId, getRoomKey);
  });

  //handle disconnects
  require('./disconnect')(Ravel, primus, broadcast, getUserId, getUserKey, getRoomKey);

  return broadcast;
};
