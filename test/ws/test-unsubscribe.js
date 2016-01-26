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

  describe('spark.on(\'unsubscribe\')', function() {
    it('should callback with Ravel.ApplicationError.IllegalValue if the user does not specify a room', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('unsubscribe', {}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined.', function(done) {
      const error = new Error();
      sinon.stub(Mocks.roomResolver, 'resolve', function() {
        return {
          name: '/test/:testId',
          params: ['testId', 'entityId'],
          regex: new RegExp('/test/(\\w+)/entity/(\\w+)'),
          authorize: function(){}
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
      Mocks.spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.equal(error);
        expect(result).to.be.null;
        done();
      });
    });

    it('should allow users to unsubscribe from rooms', function(done) {
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
      const leaveSpy = sinon.spy(Mocks.spark, 'leave');
      const broadcastSpy = sinon.spy(Mocks.broadcast, 'emit');
      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('unsubscribe', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.be.true;
        expect(leaveSpy).to.have.been.calledWith('/test/1');
        process.nextTick(function() {
          expect(broadcastSpy).to.have.been.calledWithMatch('/test/1', 'user disconnected', {userId: 1}, true);
          done();
        });
      });
    });
  });
});
