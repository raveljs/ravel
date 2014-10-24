'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 *
 * Allows websocket broadcasts to reach all nodes in an application cluster
 * (and thus all clients connected to the application cluster) by using the
 * Redis publish/subscribe framework. 
 *
 * MUST be used for ALL broadcasts in the application, or they won't reach all
 * clients connected to all nodes in a cluster
 */
 
var redis = require('redis');
var ApplicationError = require('./application_error');

var instance;
var singleton = function(Ravel, primus, RoomResolver) {

  var broadcastChannel = 'tapestry_broadcast:';
  
  var cacheTimeSeconds = Ravel.get('websocket message cache time') ? Number(Ravel.get('websocket message cache time')) : 24*60*60;
  
  var pub = redis.createClient(Ravel.get('redis port'), Ravel.get('redis host'), {});
  if (Ravel.get('redis password')) {
    pub.auth(Ravel.get('redis password'), function(err){if (err) {throw err;}});
  }
  pub.select(0);
  
  var sub = redis.createClient(Ravel.get('redis port'), Ravel.get('redis host'), {});
  if (Ravel.get('redis password')) {
    sub.auth(Ravel.get('redis password'), function(err){if (err) {throw err;}});
  }
  sub.select(0);
  sub.subscribe(broadcastChannel);
  sub.on('message', function(channel, broadcastString) {
    if (channel === broadcastChannel) {
      var broadcast = JSON.parse(broadcastString);
      primus.room(broadcast.room).send('broadcast', broadcast.msg);
    }
  });
  
  /**
   * Emit a message to all clients, on all nodes in the cluster, which are 
   * members of a specific room
   *
   * @param {String} room the room to emit to
   * @param {String} event the event name
   * @param {Object} data the data to emit
   * @param {Boolean} dontCache if true, don't cache this message for replay
   */
  this.emit = function(room, event, data, dontCache) {
    if (RoomResolver.resolve(room) === undefined) {
      Ravel.Log.l('Attempting to emit event \'' + event + '\' with data ' + data + ' to non-existent room \'' + room + '\'');
    }
    var time = Date.now();
    var msg = {
      event:event,
      data:data
    };
    pub.publish(broadcastChannel, JSON.stringify({
      room: room,
      msg: msg
    }));
    if (!dontCache) {
      //save message to redis so that it can be replayed to a client
      //which may have lost its connection.
      var key = 'ravel_broadcast_emit:'+room;
      Ravel.kvstore.zadd([key, String(time), JSON.stringify(msg)], function(err) {
        if (err) {
          Ravel.Log.e(err);
        } else {
          //cleanup cache. TODO: move to daemon?
          Ravel.kvstore.zremrangebyscore(key, '-inf', String(time-cacheTimeSeconds), function(err) {
            if (err) {Ravel.Log.e(err);}
          });
        }
      }); 
    }   
  };
  
  /**
   * Retrieves any cached messages published to a room after timestamp,
   * and callback(null,{Array}). If the timestamp is before the cache uptime,
   * callback(err, null); PRECONDITION: The user should already be a verified
   * member of the room before they receive these missed messages.
   *
   * @param room the name of the room.
   * @param timestamp time in millis that the client last lost connection
   */
   this.getMissedMessages = function(room, timestamp, callback) {
    if (Number(timestamp) < Date.now() - cacheTimeSeconds*1000) {
      //Then we are outside of the cache uptime window and can't satisfy requests.
      callback(new ApplicationError.RangeOutOfBounds('Cannot satisfy request for missed messages because client lost connection outside of the cache history window. Please refresh all data.'), null);
    } else {
      //then we are inside the cache uptime window
      Ravel.kvstore.zrangebyscore(['ravel_broadcast_emit:'+room, timestamp, '+inf'], function(err, messages) {
        if (err) {
          Ravel.Log.e(err);
          callback(new Error('Cannot satisfy request for missed messages due to error during cache access. Please refresh all data.'), null); 
        } else {
          callback(null, messages);
        }
      });
    }
  };
};
 
/**
 * Singleton getInstance definition
 * @return singleton class
 */
singleton.getInstance = function(Ravel, primus, RoomResolver) {
  if(!instance) {
    instance = new singleton(Ravel, primus, RoomResolver);
  }
  return instance;
};
 
module.exports = singleton.getInstance;
