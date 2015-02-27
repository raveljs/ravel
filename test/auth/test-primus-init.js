'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');
var EventEmitter = require('events').EventEmitter;
var httpMocks = require('node-mocks-http');

var Ravel,
    redisClientStub,
    primus,
    spark,
    expressSessionStore,
    cookieParser,
    tokenToProfile,
    broadcast,
    roomResolver;

describe('auth/primus_init', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    //mock redis
    redisClientStub = {
      auth: function(){}
    };
    mockery.registerMock('redis', {
      createClient: function() {
        return redisClientStub;
      },
    });
    //mock cookie parser
    cookieParser = function(){};
    mockery.registerMock('cookie-parser', function(){
      return cookieParser;
    });
    //mock token auth
    tokenToProfile = {
      tokenToProfile: function(){}
    };
    mockery.registerMock('./authorize_token', function() {
      return tokenToProfile;
    });
    //mock broadcast
    broadcast = {
      emit: function(){},
      getMissedMessages: function(){}
    };
    mockery.registerMock('../util/broadcast', function() {
      return broadcast;
    });
    //mock primus
    primus = new EventEmitter();
    primus.authorize = sinon.stub();
    //mock primus spark
    spark = new EventEmitter();
    spark.headers = {};
    spark.join = function(room, callback) {
      callback();
    };
    spark.leave = function(room, callback) {
      callback();
    };
    //mock express session store
    expressSessionStore = {
      get: function(){}
    };
    //build room resolver around mock room table
    roomResolver = {
      resolve: function(){return undefined;}
    };

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.db = {
      scoped: function(){},
      middleware: function(){}
    };
    Ravel.kvstore = {
      sadd:function(){},
      srem:function(){}
    };
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis password', 'password');
    Ravel.set('express session secret', 'mysecret');

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    primus = undefined;
    spark = undefined;
    redisClientStub = undefined;
    roomResolver = undefined;
    cookieParser = undefined;
    tokenToProfile = undefined;
    mockery.disable();
    done();
  });

  describe('primus.authorize', function() {
    it('should create a primus authorization function which authorizes users who have a valid express/passport session', function(done) {
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      var session = {
        passport: {
          user: 1
        }
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, session);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.null;
          expect(user).to.equal(session.passport.user);
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });

    it('should create a primus authorization function which rejects users who have an unauthorized express/passport session', function(done) {
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      var session = {
        //unauthorized
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, session);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });

    it('should create a primus authorization function which rejects users when it cannot retrieve their session', function(done) {
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      var error = new Error();
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(error, null);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.equal(error);
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });

    it('should create a primus authorization function which authorizes users who have valid x-auth-token and x-auth-client headers', function(done) {
      var profile = {
        id: 1,
        name: 'Sean McIntyre'
      };
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(null, profile);
      });
      Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(null, profile);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.null;
          expect(user).to.equal(1);
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });

    it('should create a primus authorization function which rejects users who have invalid x-auth-token and x-auth-client headers', function(done) {
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(new Error(), null);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.not.null;
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });

    it('should create a primus authorization function which rejects users who have valid x-auth-token and x-auth-client headers, but aren\'t registered users', function(done) {
      var profile = {
        id: 1,
        name: 'Sean McIntyre'
      };
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(null, profile);
      });
      Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(new Ravel.ApplicationError.NotFound('User does not exist'), null);
      });
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.not.null;
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
    });
  });

  describe('spark.on(\'subscribe\')', function() {
    it('should callback with Ravel.ApplicationError.IllegalValue when a user attempts to subscribe to a websocket room without specifying the room.', function(done) {
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {}, function(err, result) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined.', function(done) {
      var error = new Error();
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          name: '/test/:testId',
          params: ['testId', 'entityId'],
          regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
          authorize: function(){}
        };
      });
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(error);
      });
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.equal(error);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.Access if the user does not pass the room\'s authorization function.', function(doneTest) {
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, done) {
              expect(userId).to.equal(1);
              done(null, false);
            }
          }
        };
      });
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.Access);
        expect(result).to.be.null;
        doneTest();
      });
    });

    it('should allow users to subscribe to rooms for which they are authorized', function(doneTest) {
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, done) {
              expect(userId).to.equal(1);
              done(null, true);
            }
          }
        };
      });
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      var joinSpy = sinon.spy(spark, 'join');
      var broadcastSpy = sinon.spy(broadcast, 'emit');
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1'}, function(err) {
        expect(err).to.be.null;
        expect(joinSpy).to.have.been.calledWith('/test/1');
        process.nextTick(function() {
          expect(broadcastSpy).to.have.been.calledWithMatch('/test/1', 'user connected', {userId: 1}, true);
          doneTest();
        });
      });
    });

    it('should callback with missed websocket messages if the user specifies a lastDisconnectTime', function(doneTest) {
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, done) {
              expect(userId).to.equal(1);
              done(null, true);
            }
          }
        };
      });
      var messages = [];
      sinon.stub(broadcast, 'getMissedMessages', function(roomName, lastDisconnectTime, callback){
        callback(null, messages);
      });
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      var joinSpy = sinon.spy(spark, 'join');
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1', lastDisconnectTime:999999}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.equal(messages);
        expect(joinSpy).to.have.been.calledWith('/test/1');
        doneTest();
      });
    });

    it('should cache userIds in sparks', function(doneTest) {
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, done) {
              expect(userId).to.equal(1);
              done(null, true);
            }
          }
        };
      });
      cookieParser = sinon.stub();
      var getSessionSpy = sinon.spy(expressSessionStore, 'get');
      var joinSpy = sinon.spy(spark, 'join');
      spark.userId = 1;
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('subscribe', {room:'/test/1'}, function(err) {
        expect(err).to.be.null;
        expect(getSessionSpy).to.not.have.been.called;
        expect(cookieParser).to.not.have.been.called;
        expect(joinSpy).to.have.been.calledWith('/test/1');
        doneTest();
      });
    });
  });

  describe('spark.on(\'unsubscribe\')', function() {
    it('should callback with Ravel.ApplicationError.IllegalValue if the user does not specify a room', function(done) {
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('unsubscribe', {}, function(err, result) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined.', function(done) {
      var error = new Error();
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          name: '/test/:testId',
          params: ['testId', 'entityId'],
          regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
          authorize: function(){}
        };
      });
      cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(expressSessionStore, 'get', function(sessionId, callback) {
        callback(error);
      });
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.equal(error);
        expect(result).to.be.null;
        done();
      });
    });

    it('should allow users to unsubscribe from rooms', function(done) {
      sinon.stub(roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, done) {
              expect(userId).to.equal(1);
              done(null, true);
            }
          }
        };
      });
      spark.userId = 1;
      var leaveSpy = sinon.spy(spark, 'leave');
      require('../../lib-cov/auth/primus_init')(
        Ravel, Ravel._injector, primus, expressSessionStore, roomResolver);
      primus.emit('connection', spark);
      spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.true;
        expect(leaveSpy).to.have.been.calledWith('/test/1');
        done();
      });
    });
  });
});
