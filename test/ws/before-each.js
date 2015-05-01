'use strict';

/**
 * Common mocking logic for all primus-related tests
 */
var EventEmitter = require('events').EventEmitter;
var sinon = require('sinon');

module.exports = function(mockery, callback) {
  var Mocks = {};
  //mock redis
  Mocks.redisClientStub = {
    auth: function(){}
  };
  mockery.registerMock('redis', {
    createClient: function() {
      return Mocks.redisClientStub;
    },
  });
  //mock cookie parser
  Mocks.cookieParser = function(){};
  mockery.registerMock('cookie-parser', function(){
    return Mocks.cookieParser;
  });
  //mock token auth
  Mocks.tokenToProfile = {
    tokenToProfile: function(){}
  };
  mockery.registerMock('../auth/authorize_token', function() {
    return Mocks.tokenToProfile;
  });
  //mock broadcast
  Mocks.broadcast = {
    emit: function(){},
    getMissedMessages: function(){}
  };
  mockery.registerMock('../ws/util/broadcast', function() {
    return Mocks.broadcast;
  });
  //mock primus
  Mocks.primus = new EventEmitter();
  Mocks.primus.authorize = sinon.stub();
  //mock primus spark
  Mocks.spark = new EventEmitter();
  Mocks.spark.headers = {};
  Mocks.spark.join = function(room, callback) {
    callback();
  };
  Mocks.spark.leave = function(room, callback) {
    callback();
  };
  //mock express session store
  Mocks.expressSessionStore = {
    get: function(){}
  };
  //build room resolver around mock room table
  Mocks.roomResolver = {
    resolve: function(){return undefined;}
  };

  Mocks.Ravel = new require('../../lib-cov/ravel')();
  Mocks.Ravel.db = {
    scoped: function(){},
    middleware: function(){}
  };
  Mocks.Ravel.kvstore = {
    sadd:function(){},
    srem:function(){},
    sismember:function(){},
    smembers:function(){},
    del:function(){}
  };
  Mocks.Ravel.Log.setLevel(Mocks.Ravel.Log.NONE);
  Mocks.Ravel.set('redis port', 0);
  Mocks.Ravel.set('redis host', 'localhost');
  Mocks.Ravel.set('redis password', 'password');
  Mocks.Ravel.set('express session secret', 'mysecret');

  callback(Mocks);
};
