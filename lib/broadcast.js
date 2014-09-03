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
 
var l = require('./log')('broadcast.js');
var redis = require('redis');

var singleton = function(primus, kvstore) {
  if(singleton.caller !== singleton.getInstance){
    throw new Error("broadcast.js must be instantiated via getInstance(primus)");
  }

  var broadcastChannel = "tapestry_broadcast:";
  
  var cacheTimeSeconds = process.env.WEBSOCKET_MESSAGE_CACHE_TIME ? Number(process.env.WEBSOCKET_MESSAGE_CACHE_TIME) : 24*60*60;
  
  var pub = redis.createClient(process.env.REDIS_DATABASE_PORT, process.env.REDIS_DATABASE_HOST, {});
  if (process.env.REDIS_DATABASE_AUTH_PW) {
    pub.auth(process.env.REDIS_DATABASE_AUTH_PW, function(err){if (err) {throw err;}});
  }
  pub.select(process.env.WEBSOCKET_STORE_REDIS_INDEX);
  
  var sub = redis.createClient(process.env.REDIS_DATABASE_PORT, process.env.REDIS_DATABASE_HOST, {});
  if (process.env.REDIS_DATABASE_AUTH_PW) {
    sub.auth(process.env.REDIS_DATABASE_AUTH_PW, function(err){if (err) {throw err;}});
  }
  sub.select(process.env.WEBSOCKET_STORE_REDIS_INDEX);
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
   * @param {Object} context any context information for the event, such as
   *                         the workspace/task the event occurred in
   * @param {Object} data the data to emit
   * @param {Boolean} dontCache if true, don't cache this message for replay
   */
  this.emit = function(room, event, context, data, dontCache) {
    var time = Date.now();
    var msg = {
      event:event,
      context:context,
      data:data
    };
    pub.publish(broadcastChannel, JSON.stringify({
      room: room,
      msg: msg
    }));
    if (!dontCache) {
      //save message to redis so that it can be replayed to a client
      //which may have lost its connection.
      var key = "tapestry_broadcast_emit:"+room;
      kvstore.zadd([key, String(time), JSON.stringify(msg)], function(err, result) {
        if (err) {
          l.e(err);
        } else {
          //cleanup cache. TODO: move to daemon?
          kvstore.zremrangebyscore(key, "-inf", String(time-cacheTimeSeconds), function(err, result) {
            if (err) {l.e(err);}
          });
        }
      }); 
    }   
  };

  this.toWorkspace = function(workspaceId, err, result, context, event, dontCache) {
    if(primus && !err && result) {
      this.emit(
        '/workspaces/'+workspaceId, 
        event,
        context,
        result,
        dontCache
      );
    }
  };

  this.toTask = function(workspaceId, taskId, err, result, context, event, dontCache) {
    if(primus && !err && result) {
      this.emit(
        '/workspaces/'+workspaceId+'/tasks/'+taskId, 
        event,
        context,
        result,
        dontCache
      );
    }
  };

  this.toUser = function(userId, err, result, context, event, dontCache) {
    if(primus && !err) {
      this.emit(
        '/users/'+userId, 
        event, 
        context, 
        result,
        dontCache
      );
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
    kvstore.get("broadcast-uptime", function(err, result) {
      if (Number(timestamp) < Number(result)) {
        //Then we are outside of the cache uptime window and can't satisfy requests.
        callback(new Error("Cannot satisfy request for missed messages because client lost connection outside of the cache history window. Please refresh all data."), null);
      } else {
        //then we are inside the cache uptime window
        kvstore.zrangebyscore(["tapestry_broadcast_emit:"+room, timestamp, "+inf"], function(err, messages) {
          if (err) {
            l.e(err);
            callback(new Error("Cannot satisfy request for missed messages due to error during cache access. Please refresh all data."), null); 
          } else {
            callback(null, messages);
          }
        });
      }
    });
  };
};
 
/**
 * Singleton getInstance definition
 * @return singleton class
 */
singleton.getInstance = function(primus, kvstore) {
  if(!this.instance) {
    this.instance = new singleton(primus, kvstore);
    kvstore.setnx("broadcast-uptime", Date.now());
  }
  return this.instance;
};
 
module.exports = singleton.getInstance;
