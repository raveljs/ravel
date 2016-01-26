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

  describe('spark.on(\'emit\')', function() {
    it('should callback with Ravel.ApplicationError.IllegalValue if the user does not specify a room', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.IllegalValue if the user does not specify an event', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {room:'/test/1', event:'test event'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined', function(done) {
      const error = new Error();
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
        callback(error);
      });
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {room:'/test/1', event:'test event'}, function(err, result) {
        expect(err).to.equal(error);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user is not a member of the room', function(done) {
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
      Mocks.spark.userId = 1;
      const isMemberSpy = sinon.stub(Mocks.Ravel.kvstore, 'sismember', function() {
        return false;
      });
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {room:'/test/1', event:'test event'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.Access);
        expect(result).to.be.null;
        expect(isMemberSpy).to.have.been.calledWith('ws_room:/test/1', 1);
        done();
      });
    });

    it('should broadacst the message', function(done) {
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
      Mocks.spark.userId = 1;
      const isMemberSpy = sinon.stub(Mocks.Ravel.kvstore, 'sismember', function() {
        return true;
      });
      const broadcastSpy = sinon.spy(Mocks.broadcast, 'emit');
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('emit', {room:'/test/1', event:'test event', message:'test message'}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.ok;
        expect(isMemberSpy).to.have.been.calledWith('ws_room:/test/1', 1);
        expect(broadcastSpy).to.have.been.calledWith('ws_room:/test/1', 'test event', 'test message');
        done();
      });
    });
  });
});
