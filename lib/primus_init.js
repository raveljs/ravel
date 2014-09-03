/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Initializes primus, handles client room joining/leaving, and 
 * receives/handles all client events which have callbacks 
 * (via primus-emitter in primus.io). These callbacks are always to a SINGLE
 * client (spark), and not a broadcast. All broadcasts are handled by
 * the cluster-compatible broadcast.js library.
 */
 
var ApplicationError = require('./application_error')
var l = require('./log')('primus_init');

module.exports = function(Ravel, primus, expressSessionStore, RoomResolver) {

  var cookieParser = require('cookie-parser')(Ravel.get('express session secret'));

  var bearerAuth = require('./authorize_bearer_token')(Ravel);
  
  var broadcast = require('./broadcast')(Ravel, primus, RoomResolver);

  //TODO handle disconnection from all rooms gracefully
  
  var getRoomKey = function(room) {
    return 'ws_room:' + room;
  };
  var getUserKey = function(user) {
    return 'ws_user:' + user;
  };

  //Primus authorization - only allow users with
  //valid sessions or oauth bearer tokens to
  //connect to primus. Very similar to code what
  //is in authorize_request.js
  var authorize = function(req, callback) {
    if (req.headers['x-auth-token'] && req.headers['x-auth-client']) {
      bearerAuth.bearerToProfile(req.headers["x-auth-token"], req.headers['x-auth-client'], function(err, profile) {
        if (err) {
          l.e('User not authorized to connect to primus');
          callback(err, false);
        } else {
          l.l('User id=' + profile.id + ' authorized to connect to primus via OAuth2.0 bearer token');
          callback(null, profile.id);
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
        if(!err && session && session.passport.user) {            
          l.l('User id=' + session.passport.user + ' authorized to connect to primus');
          callback(null, session.passport.user);
        } else {
          l.e('User not authorized to connect to primus');
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
        callback(ApplicationError.IllegalValue('subscribe websocket message must contain \'room\' string property'), null);
        return;
      } 
      //try to resolve room string against list of registered room patterns 
      var resolvedRoom = RoomResolver.resolve(data.room);
      if (!resolvedRoom) {
        callback(ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);  
      } else {
        //use client-supplied authorization function
        getUserId(spark, function(err, userId) {
          if (err) {
            callback(err, null);
          } else if (!resolvedRoom.room.authorize || typeof resolvedRoom.room.authorize !== 'function'){
            //this should crash the app
            throw new ApplicationError.IllegalValue('Authorization function for room ' + data.room + ' is either undefined or not a function.');
          } else {
            resolvedRoom.room.authorize(userId, resolvedRoom.params, function(err, result) {
              if (err || !result) {
                callback(err, null);
              } else {
                //user is authorized to connect to room                
                spark.join(resolvedRoom.instance, function() {                  
                  //store new room member in kvstore
                  Ravel.kvstore.sadd(getRoomKey(resolvedRoom.instance), userId);
                  //store new room in user's connected room list
                  Rave.kvstore.sadd(getUserKey(userId), resolvedRoom.instance);
                  //if the user supplied a last disconnection timestamp,
                  //grab all the messages they missed since then
                  if (data.lastDisconnectTime) {
                    broadcast.getMissedMessages(room, data.lastDisconnectTime, function(err, messages) {
                      callback(null, messages);
                    });
                  } else {
                    //done
                    callback(null,true);                      
                  }
                  //let everyone know the user connected
                  l.l('user id=' + userId + ' joined room ' + resolvedRoom.instance);
                  broadcast.emit(
                    resolvedRoom.instance,
                    'user connected',
                    {userId:userId},
                    true
                  );
                });
              }
            });
          }
        });        
      }
    });

    //room disconnection
    spark.on('unsubscribe', function(data, callback) {      
      if (!data.room || typeof data.room !== 'string') {
        callback(ApplicationError.IllegalValue('unsubscribe websocket message must contain \'room\' string property'), null);
        return;
      }
      var resolvedRoom = RoomResolver.resolve(data.room);
      if (!resolvedRoom) {
        callback(ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);  
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
              l.l('user id=' + userId + ' left room ' + resolvedRoom.instance);
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
        callback(ApplicationError.IllegalValue('unsubscribe websocket message must contain \'room\' string property'), null);
        return;
      }
      var resolvedRoom = RoomResolver.resolve(data.room);
      if (!resolvedRoom) {
        callback(ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);  
      } else {
        getUserId(spark, function(err, userId) {
          if (err || !userId) {
            callback(err, null);
          } else if (!Ravel.kvstore.sismember(getRoomKey(resolvedRoom.instance), userId)) {
            callback(new ApplicationError.Access('User outside of room \'' + resolvedRoom.instance + '\' requested connected users.'), null);
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
        callback(ApplicationError.IllegalValue('unsubscribe websocket message must contain \'room\' string property'), null);
        return;
      }
      var resolvedRoom = RoomResolver.resolve(data.room);
      if (!resolvedRoom) {
        callback(ApplicationError.NotFound('Specified room ' + data.room + ' does not exist.'), null);  
      } else {
        getUserId(spark, function(err, userId) {
          if (err || !userId) {
            callback(err, null);
          } else if (!Ravel.kvstore.sismember(getRoomKey(resolvedRoom.instance), userId)) {
            callback(new ApplicationError.Access('User outside of room \'' + resolvedRoom.instance + '\' requested connected users.'), null);
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
      //disconnect user from all rooms they're in
      //(so that other users get a clean disconnect message even
      //if this user just lost power or closed the tab)
      kvstore.smembers(getUserKey(userId), function(err, rooms) {
        for (var i=0;i<connectedRooms.length;i++) {
          spark.leave(connectedRooms[i], function() {
            //remove disconnected user from room's kvstore cache
            Ravel.kvstore.srem(getRoomKey(connectedRooms[i]), userId);
            //let everyone know
            l.l('user id=' + userId + ' left room ' + connectedRooms[i]);
            broadcast.emit(
              connectedRooms[i],
              'user disconnected',
              {userId:userId},
              true
            );
          });
        }
        //empty user list of connected rooms
        kvstore.del(getUserKey(userId));
      });
    });    
  });
  
  return broadcast;
};