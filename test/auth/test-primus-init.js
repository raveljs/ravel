'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var sinon = require('sinon');
var mockery = require('mockery');
var EventEmitter = require('events').EventEmitter;
var httpMocks = require('node-mocks-http');

var Ravel,
    redisClientStub,
    primus,
    expressSessionStore,
    cookieParser,
    tokenToProfile,
    broadcast,
    rooms,
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
    //mock express session store
    expressSessionStore = {
      get: function(){}
    };
    //build room resolver around mock room table
    rooms = {};
    roomResolver = require('../../lib-cov/util/websocket_room_resolver')(rooms);

    Ravel = new require('../../lib-cov/ravel')();
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
    redisClientStub = undefined;
    rooms = undefined;
    roomResolver = undefined;
    cookieParser = undefined;
    tokenToProfile = undefined;
    mockery.disable();
    done();
  });

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
