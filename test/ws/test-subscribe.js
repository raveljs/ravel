'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');

let Mocks;

describe('auth/primus_init', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    require('./before-each')(mockery, function(M) {
      Mocks = M;
      done();
    });
  });

  afterEach(function(done) {
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('spark.on(\'subscribe\')', function() {
    it('should callback with Ravel.ApplicationError.IllegalValue when a user attempts to subscribe to a websocket room without specifying the room.', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined.', function(done) {
      const error = new Error();
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
        return {
          instance: '/test/1',
          params: ['1'],
          room: {
            name: '/test/:testId',
            params: ['testId'],
            regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
            authorize: function(userId, d) {
              expect(userId).to.equal(1);
              d(null, true);
            }
          }
        };
      });
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(error);
      });
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.equal(error);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.Access if the user does not pass the room\'s authorization function.', function(doneTest) {
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
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
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.Access);
        expect(result).to.be.null;
        doneTest();
      });
    });

    it('should allow users to subscribe to rooms for which they are authorized', function(doneTest) {
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
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
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      const joinSpy = sinon.spy(Mocks.spark, 'join');
      const broadcastSpy = sinon.spy(Mocks.broadcast, 'emit');
      const saddSpy = sinon.spy(Mocks.Ravel.kvstore, 'sadd');
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1'}, function(err) {
        expect(err).to.be.null;
        expect(joinSpy).to.have.been.calledWith('/test/1');
        expect(saddSpy).to.have.been.calledWith('ws_room:/test/1', 1);
        expect(saddSpy).to.have.been.calledWith('ws_user:1', '/test/1');
        process.nextTick(function() {
          expect(broadcastSpy).to.have.been.calledWithMatch('/test/1', 'user connected', {userId: 1}, true);
          doneTest();
        });
      });
    });

    it('should callback with missed websocket messages if the user specifies a lastDisconnectTime', function(doneTest) {
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
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
      const messages = [];
      sinon.stub(Mocks.broadcast, 'getMissedMessages', function(roomName, lastDisconnectTime, callback){
        callback(null, messages);
      });
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, {passport:{user:1}});
      });
      const joinSpy = sinon.spy(Mocks.spark, 'join');
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1', lastDisconnectTime:999999}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.equal(messages);
        expect(joinSpy).to.have.been.calledWith('/test/1');
        doneTest();
      });
    });

    it('should cache userIds in sparks', function(doneTest) {
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
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
      Mocks.cookieParser = sinon.stub();
      const getSessionSpy = sinon.spy(Mocks.expressSessionStore, 'get');
      const joinSpy = sinon.spy(Mocks.spark, 'join');
      Mocks.spark.userId = 1;
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('subscribe', {room:'/test/1'}, function(err) {
        expect(err).to.be.null;
        expect(getSessionSpy).to.not.have.been.called;
        expect(Mocks.cookieParser).to.not.have.been.called;
        expect(joinSpy).to.have.been.calledWith('/test/1');
        doneTest();
      });
    });
  });
});
