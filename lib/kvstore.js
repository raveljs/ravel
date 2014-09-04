'use strict';

/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */
//Should probably read this one day: http://ngchi.wordpress.com/2010/08/23/towards-auto-sharding-in-your-node-js-app/ it's about node-hash-ring, which appears to be written by the same guy who did node-redis.
//Forcing everything to go through this should help if we need to replace/shard/cluster redis one day.

var redis = require('redis');

module.exports = function(prefix, Ravel) {

  function p(key) {
    return prefix + key;
  }

  //set up redis cache
  //Deliberately do this here to prevent people from using other database 
  //numbers or multiple databases (we're using 0 by default)
  var client = redis.createClient(Ravel.get('redis port'), Ravel.get('redis host'), {});  
  if (Ravel.get('redis password')) {
    client.auth(Ravel.get('redis password'), function(err){if (err) {throw err;}});
  }

  var kvstore = {};
  
  //TODO finish adding redis functions here as required but be sure to use p(key)!
  kvstore.expire = function(key, seconds) {
    client.expire(p(key), seconds);
  };
  
  kvstore.set = function(key, value) {
    client.set(p(key), value);
  };
  
  kvstore.setnx = function(key, value) {
   client.setnx(p(key), value);
  };
  
  kvstore.setex = function(key, seconds, value) {
    client.setex(p(key), seconds, value);
  };
  
  kvstore.get = function(key, callback) {
    client.get(p(key), callback);
  };
  
  kvstore.del = function(key) {
    client.del(p(key));
  };
  
  kvstore.sadd = function(key, element) {
    client.sadd(p(key), element);
  };
  
  kvstore.srem = function(key, element) {
    client.srem(p(key), element);
  };

  kvstore.sismember = function(key, value, callback) {
    client.sismember(p(key), value, callback);
  };
  
  kvstore.smembers = function(key, callback) {
    client.smembers(p(key), callback);
  };
  
  kvstore.rpush = function(key, element) {
    client.rpush(p(key), element);
  };
  
  kvstore.lrange = function(key, start, stop, callback) {
    client.lrange(p(key), start, stop, callback);
  };
  
  kvstore.keys = function(keyPattern, callback) {
    client.keys(p(keyPattern), callback);
  };
  
  kvstore.zadd = function(args, callback) {
    if (args.length < 3) {
      callback(new Error('ZADD requires at least 3 arguments.'), null);
    } else {
      args[0] = p(args[0]);
      client.zadd(args, callback);
    }
  };
  
  kvstore.zrangebyscore = function(args, callback) {
    if (args.length < 3) {
      callback(new Error('ZRANGEBYSCORE requires at least 3 arguments.'), null);
    } else {
      args[0] = p(args[0]);
      client.zrangebyscore(args, callback);
    }
  };
  
  kvstore.zremrangebyscore = function(key, min, max, callback) {
    client.zremrangebyscore(p(key), min, max, callback);
  };
  
  kvstore.flushdb = function() {
    client.flushdb();
  };
  
  return kvstore;
};
