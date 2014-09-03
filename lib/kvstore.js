/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */
//Should probably read this one day: http://ngchi.wordpress.com/2010/08/23/towards-auto-sharding-in-your-node-js-app/ it's about node-hash-ring, which appears to be written by the same guy who did node-redis.
//Forcing everything to go through this should help if we need to replace/shard/cluster redis one day.

var l = require('./log')('kvstore'); 
var ApplicationError = require('./application_error');
var redis = require('redis');

module.exports = function(prefix, Ravel) {

  function p(key) {
    return prefix + key;
  }

  //set up redis cache
  //Deliberately do this here to prevent people from using other database 
  //numbers or multiple databases (we're using 0 by default)
  var kvstore = redis.createClient(Ravel.get('redis port'), Ravel.get('redis host'), {});  
  if (Ravel.get('redis password')) {
    kvstore.auth(Ravel.get('redis password'), function(err){if (err) {throw err;}});
  }
  
  //TODO finish adding redis functions here as required but be sure to use p(key)!
  this.expire = function(key, seconds) {
    kvstore.expire(p(key), seconds);
  };
  
  this.set = function(key, value) {
    kvstore.set(p(key), value);
  };
  
  this.setnx = function(key, value) {
   kvstore.setnx(p(key), value);
  };
  
  this.setex = function(key, seconds, value) {
    kvstore.setex(p(key), seconds, value);
  };
  
  this.get = function(key, callback) {
    kvstore.get(p(key), callback);
  };
  
  this.del = function(key) {
    kvstore.del(p(key));
  };
  
  this.sadd = function(key, element) {
    kvstore.sadd(p(key), element);
  };
  
  this.srem = function(key, element) {
    kvstore.srem(p(key), element);
  };

  this.sismember = function(key, value, callback) {
    kvstore.sismember(p(key), value, callback);
  };
  
  this.smembers = function(key, callback) {
    kvstore.smembers(p(key), callback);
  };
  
  this.rpush = function(key, element) {
    kvstore.rpush(p(key), element);
  };
  
  this.lrange = function(key, start, stop, callback) {
    kvstore.lrange(p(key), start, stop, callback);
  };
  
  this.keys = function(keyPattern, callback) {
    kvstore.keys(p(keyPattern), callback);
  };
  
  this.zadd = function(args, callback) {
    if (args.length < 3) {
      callback(new Error('ZADD requires at least 3 arguments.'), null);
    } else {
      args[0] = p(args[0]);
      kvstore.zadd(args, callback);
    }
  };
  
  this.zrangebyscore = function(args, callback) {
    if (args.length < 3) {
      callback(new Error('ZRANGEBYSCORE requires at least 3 arguments.'), null);
    } else {
      args[0] = p(args[0]);
      kvstore.zrangebyscore(args, callback);
    }
  };
  
  this.zremrangebyscore = function(key, min, max, callback) {
    kvstore.zremrangebyscore(p(key), min, max, callback);
  };
  
  this.flushdb = function() {
    kvstore.flushdb();
  };
  
  return this;
};
