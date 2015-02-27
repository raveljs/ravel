'use strict';

/**
 * Initializes primus, handles client room joining/leaving, and
 * receives/handles all client events which have callbacks
 * (via primus-emitter in primus.io). These callbacks are always to a SINGLE
 * client (spark), and not a broadcast. All broadcasts are handled by
 * the cluster-compatible broadcast.js library.
 */

module.exports = function(Ravel, injector, primus, expressSessionStore, RoomResolver) {

  var cookieParser = require('cookie-parser')(Ravel.get('express session secret'));

  var tokenAuth = require('./authorize_token')(Ravel);

  var broadcast = require('../util/broadcast')(Ravel, primus, RoomResolver);

  var getRoomKey = function(room) {
    return 'ws_room:' + room;
  };
  var getUserKey = function(user) {
    return 'ws_user:' + user;
  };

  //Primus authorization - only allow users with
  //valid sessions or oauth bearer tokens to
  //connect to primus. Very similar to code in authorize_request.js
  var authorize = function(req, callback) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      tokenAuth.tokenToProfile(req.headers['x-auth-token'], req.headers['x-auth-client'], function(err, profile) {
        if (err) {
          Ravel.Log.error('User not authorized to connect to primus');
          callback(err, false);
        } else {
          Ravel.get('get user function')(Ravel, profile, function(err, user) {
            if (err) {
              Ravel.Log.error(err);
              callback(err, false);
            } else {
              Ravel.Log.debug('User id=' + user.id + ' authorized to connect to primus via OAuth2.0 bearer token');
              callback(null, user.id);
            }
          });
        }
      });
    } else {
      var cookie;
      cookieParser(req, {}, function(err) {
        if (err) {throw err;}
        cookie = req.signedCookies;
      });
      expressSessionStore.get(cookie['connect.sid'], function(err, session) {
        //session.passport.user is actually a user id
        if(!err && session && session.passport && session.passport.user) {
          Ravel.Log.debug('User id=' + session.passport.user + ' authorized to connect to primus');
          callback(null, session.passport.user);
        } else {
          Ravel.Log.error('User not authorized to connect to primus');
          callback(err, false);
        }
      });
    }
  };
  primus.authorize(authorize);


  //retrieves a user id from a spark
  var getUserId = function(spark, callback) {
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

    //room connection
    spark.on('subscribe', function(data, callback) {
      if (!data.room || typeof data.room !== 'string') {
        callback(new Ravel.ApplicationError.IllegalValue(
          'subscribe websocket message must contain \'room\' string property'), null);
        return;
      }
      //try to resolve room string against list of registered room patterns
      var resolvedRoom = RoomResolver.resolve(data.room);
      if (!resolvedRoom) {
        callback(new Ravel.ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);
        return;
      } else {
        //use client-supplied authorization function
        getUserId(spark, function(err, userId) {
          if (err) {
            callback(err, null);
          } else {
            var done = function(err, result) {
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

    //get users connected to a room
    spark.on('get connected users', function(data, callback) {
      if (!data.room || typeof data.room !== 'string') {
        callback(Ravel.ApplicationError.IllegalValue(
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
          } else if (!Ravel.kvstore.sismember(getRoomKey(resolvedRoom.instance), userId)) {
            callback(new Ravel.ApplicationError.Access(
              'User outside of room \'' + resolvedRoom.instance + '\' requested connected users.'), null);
          } else {
            Ravel.kvstore.smembers(resolvedRoom.instance, callback);
          }
        });
      }
    });

    //allows users to emit things to a room
    //TODO support room-configured callback for doing something with the message
    spark.on('emit', function(data, callback) {
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
          } else if (!Ravel.kvstore.sismember(getRoomKey(resolvedRoom.instance), userId)) {
            callback(new Ravel.ApplicationError.Access(
              'User outside of room \'' + resolvedRoom.instance + '\' requested connected users.'), null);
          } else {
            //emit message
            broadcast.emit(
              resolvedRoom.instance,
              data.event,
              data.message
            );
          }
        });
      }
    });
  });

////UNEXPECTED DISCONNECT
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
      Ravel.kvstore.smembers(getUserKey(userId), function(err, connectedRooms) {
        for (var i=0;i<connectedRooms.length;i++) {
          leaveRoom(connectedRooms[i]);
        }
        //empty user list of connected rooms
        Ravel.kvstore.del(getUserKey(userId));
      });
    });
  });

  return broadcast;
};
