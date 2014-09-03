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
 
var l = require('./log')('primus_init.js');
var cookieParser = require('cookie-parser')(process.env.SESSION_SECRET);

module.exports = function(app, lib, express, expressSessionStore, primus, db, kvstore) {

  var bearerAuth = require('./authorize_bearer_token')(lib, kvstore);
  
  var broadcast = require('./broadcast')(primus, kvstore);

  var disconnectUserFromAllTasks = function(userId) {
    //disconnect user from all task rooms they're in 
    //(so that other users get a clean disconnect message even
    //if this user just lost power or closed the tab)
    kvstore.smembers('/users/'+userId+'/tasks/', function(err, connectedTasks) {
      l.l('disconnecting user id=' + userId + ' from ' + connectedTasks.length + ' tasks');
      if (!err) {
        for (var key in connectedTasks) {
          var t = JSON.parse(connectedTasks[key]);
          var room = '/workspaces/'+t.workspaceId+'/tasks/'+t.taskId;
          //remove subscribed user from key-value cache
          kvstore.srem(room, userId);
          //broadcast disconnect
          broadcast.emit(
            '/workspaces/'+t.workspaceId,
            'task user disconnected',
            {workspaceId:t.workspaceId, taskId:t.taskId},
            {userId:userId},
            true
          );
        }
      } else {
        l.e(err);
      }
    });
    //empty user's list of connected tasks
    kvstore.del('/users/'+userId+'/tasks/');
  };
  
  var disconnectUserFromAllWorkspaces = function(userId) {
    //disconnect user from all workspace rooms they're in
    //(so that other users get a clean disconnect message even
    //if this user just lost power or closed the tab)
    kvstore.smembers('/users/'+userId+'/workspaces/', function(err, connectedWorkspaces) {
      l.l('disconnecting user id=' + userId + ' from ' + connectedWorkspaces.length + ' workspaces');
      if (!err) {
        for (var key in connectedWorkspaces) {
          var room = '/workspaces/'+connectedWorkspaces[key];
          //remove subscribed user from key-value cache
          kvstore.srem(room, userId);
          //broadcast disconnect
          broadcast.emit(
            room,
            'workspace user disconnected',
            {workspaceId:connectedWorkspaces[key]},
            {userId:userId},
            true
          );
        }
      } else {
        l.e(err);
      }
    });
    //empty user's list of connected workspaces
    kvstore.del('/users/'+userId+'/workspaces/');
  };

  var getUserId = function(spark, callback) {
    if (spark.userId) {
      callback(null, spark.userId);
    } else {
      var cookie;
      var req = {headers:{cookie: spark.headers.cookie}};
      cookieParser(req, {}, function(err) {
        if (err) {throw err;}
        cookie = req.signedCookies;
      });
      expressSessionStore.get(cookie['connect.sid'], function(err, session) {
          if(!err && session && session.passport.user) {                    
            //cache userId in spark
            spark.userId = session.passport.user;
            callback(null, session.passport.user);
          } else {
            l.e(err);
            callback(err, null);
          }
      });
    }
  };
  
  //Primus authorization
  primus.authorize(function(req, callback) {
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
          if(!err && session && session.passport.user) {            
            l.l('User id=' + session.passport.user + ' authorized to connect to primus');
            callback(null, session.passport.user);
          } else {
            l.e('User not authorized to connect to primus');
            callback(err, false);
          }
      });
    }
  });  

  primus.on('connection', function connection(spark) {

////////////////////////
/////////////USER ROOMS/           
////////////////////////    
    //joining user room
    spark.on('user subscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        //User can see task, so let them into the room
        var room = '/users/'+userId;
        spark.join(room, function () {
          l.l('user id='+userId + ' connected to their user websocket room.');
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
        });
      });
    });
    
    //leaving user room
    spark.on('user unsubscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = '/users/'+userId;
        spark.leave(room, function () {
          l.l('user id='+userId+' left their user websocket room.');
          callback(null, true);
        });
      });
    });
        
/////////////////////////////
/////////////WORKSPACE ROOMS/           
/////////////////////////////
    //joining workspace room
    spark.on('workspace subscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        db.getConnection(function(err, connection) {
          if (err) {
            connection.release();
            callback(err,false);
          } else {
            lib.workspaces.tCanUserSeeWorkspace(
              undefined,
              connection, 
              userId,
              data.workspaceId,
              function(err, result) {
                connection.release();
                if(err || !result) {
                  callback(err,false);
                } else {
                  //User can see workspace, so let them into the room
                  var room = '/workspaces/'+data.workspaceId;
                  spark.join(room, function () {
                    //store new workspace room member in key-value cache
                    kvstore.sadd(room, userId);
                    //store workspace in user's workspace room list
                    kvstore.sadd('/users/'+userId+'/workspaces/', data.workspaceId);
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
                    l.l('user id='+userId+' joined primus room for workspace id='+data.workspaceId);
                    //broadcast joining to room
                    broadcast.emit(
                      room,
                      'workspace user connected',
                      {workspaceId:data.workspaceId},
                      {userId:userId},
                      true
                    );
                  });                    
                }
              }
            );
          }    
        }); 
      });
    });
    
    //leaving workspace room
    spark.on('workspace unsubscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = '/workspaces/'+data.workspaceId;
        spark.leave(room, function () {
          //remove disconnected user from key-value cache
          kvstore.srem(room, userId);
          //remove workspace from user's workspace room list
          kvstore.srem('/users/'+userId+'/workspaces/', data.workspaceId);
          callback(null, true);
          l.l('user id='+userId+' left primus room for workspace id='+data.workspaceId);
          //disconnect from all tasks
          disconnectUserFromAllTasks(userId);
          //broadcast leaving to room
          broadcast.emit(
            room,
            'workspace user disconnected',
            {workspaceId:data.workspaceId},
            {userId:userId},
            true
          );
        });
      });
    });
////////////////////////
/////////////TASK ROOMS/           
////////////////////////    
    //joining task room
    spark.on('task subscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        db.getConnection(function(err, connection) {
          if (err) {
            connection.release();
            callback(err,false);
          } else {
            lib.tasks.tCanUserSeeTask(
              undefined,
              connection, 
              userId,
              data.workspaceId,
              data.taskId,
              function(err, result) {
                connection.release();
                if(err || !result) {
                  callback(err,false);
                } else {
                  //User can see task, so let them into the room
                  var room = '/workspaces/'+data.workspaceId+'/tasks/'+data.taskId;
                  spark.join(room, function () {
                    //store new task room member in key-value cache
                    kvstore.sadd(room, userId);
                    //store task in user's task room list
                    kvstore.sadd('/users/'+userId+'/tasks/', JSON.stringify(data));
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
                    l.l('user id='+userId+' joined primus room for task id='+data.taskId);
                    //broadcast joining to room
                    broadcast.emit(
                      '/workspaces/'+data.workspaceId,
                      'task user connected',
                      {workspaceId:data.workspaceId, taskId:data.taskId},
                      {userId:userId},
                      true
                    );               
                  });                    
                }
              }
            );
          }    
        });    
      });
    });
    
    //leaving task room
    spark.on('task unsubscribe', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = '/workspaces/'+data.workspaceId+'/tasks/'+data.taskId;
        spark.leave(room, function () {
          //remove disconnected user from key-value cache
          kvstore.srem(room, userId);
          //remove tasks from user's tasks room list
          kvstore.srem('/users/'+userId+'/tasks/', JSON.stringify(data));
          callback(null, true);
          l.l('user id='+userId+' left primus room for task id='+data.taskId);
          //broadcast leaving to room
          broadcast.emit(
            '/workspaces/'+data.workspaceId,
            'task user disconnected',
            {workspaceId:data.workspaceId, taskId:data.taskId},
            {userId:userId},
            true
          );
        });
      });
    });
    
    //get list of users connected to task
    spark.on('get task connected users', function(data, callback) {      
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        //send list of connected users to client
        var room = '/workspaces/' + data.workspaceId;
        if (spark.rooms().indexOf(room)>=0) {
          //send list of connected users to client
          kvstore.smembers(room + '/tasks/' + data.taskId, function(err, connectedUsers) {
            if (!err) {
              callback(connectedUsers);
            } else {
              l.e(err);
            }
          });
        } else {
          callback([]);
          l.e("User outside of workspace room id="+data.workspaceId+" requested connected users for task id="+data.taskId);
        }
      });
    });  
    
    //task upload/change (creation/deletion/undeletion)          
    spark.on('file upload change successful', function(data) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = '/workspaces/' + data.workspaceId;
        
        if (spark.rooms().indexOf(room)>=0) {
          broadcast.emit(
            room,
            'file upload change successful',
            {workspaceId:data.workspaceId, taskId:data.taskId},
            data.upload
          );
        } else {
          //ignore message
          l.e("User outside of workspace room id="+data.workspaceId+"attempted to inform other users of a successful upload");
        }  
      });    
    });
    
//////////////////////////
//Chat////////////////////    
//////////////////////////        
        
    //chat
    spark.on('send chat message', function(data) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = data.context;
        if (spark.rooms().indexOf(room)>=0) {
          //tell others in room that a message has been sent
          broadcast.emit(
            room,
            'create',
            data.context+'/chat',
            data.message
          );
          //preserve message in redis
          kvstore.rpush(data.context+"/chat", JSON.stringify(data.message));
          //update expiry of this conversation so that it will last for 48
          //hours from the last sent message
          kvstore.expire(data.context+"/chat", 48*60*60);
        } else {
          //ignore message
          l.e("User outside of room id="+data.context+" attempted to send chat message");
        }      
      });
    });
    
    
    //get recent chat messages
    spark.on('get recent chat messages', function(data, callback) {
      getUserId(spark, function(err, userId) {
        if (!userId) {return;}
        var room = data.context;
        if (spark.rooms().indexOf(room)>=0) {
          //send list of other subscribers to client
          kvstore.lrange(data.context+"/chat", -data.numMessages, -1, function(err, results) {
            if (!err) {
              callback(results);
            } else {
              l.e(err);
            }
          });
        } else {
          //ignore message
          l.e("User outside of room id="+data.context+"attempted to retrieve recent chat messages");
        }  
      });    
    });
  
});
////END primus.on('connection')

////UNEXPECTED DISCONNECT
  primus.on('disconnection', function(spark) {
    getUserId(spark, function(err, userId) {
      if (!userId) {return;}
      //disconnect from user room
      var room = '/users/'+userId;
      spark.leave(room, function () {
        l.l('user id='+userId+' disconnected and left their user websocket room.');
      });
      //disconnect user from all workspace rooms they're in
      //(so that other users get a clean disconnect message even
      //if this user just lost power or closed the tab)
      disconnectUserFromAllWorkspaces(userId);
      //disconnect user from all task rooms they're in 
      //(so that other users get a clean disconnect message even
      //if this user just lost power or closed the tab)
      disconnectUserFromAllTasks(userId);
    });    
  });
  
  return broadcast;
};
