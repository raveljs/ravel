'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');

var Mocks;

describe('auth/primus_init', function() {
  beforeEach(function(done) {
    require('./before-each')(mockery, function(M) {
      Mocks = M;
      done();
    });
  });

  afterEach(function(done) {
    mockery.disable();
    done();
  });

  describe('spark.on(\'get connected users\')', function() {
    it('should callback with Mocks.Ravel.ApplicationError.IllegalValue if the user does not specify a room', function(done) {
      require('../../lib-cov/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('get connected users', {}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.IllegalValue);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with Ravel.ApplicationError.NotFound if the requested room does not exist', function(done) {
      require('../../lib-cov/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('get connected users', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.NotFound);
        expect(result).to.be.null;
        done();
      });
    });

    it('should callback with an error if the user\'s user id cannot be determined.', function(done) {
      var error = new Error();
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
      require('../../lib-cov/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('get connected users', {room:'/test/1'}, function(err, result) {
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
      var isMemberSpy = sinon.stub(Mocks.Ravel.kvstore, 'sismember', function() {
        return false;
      });
      require('../../lib-cov/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('get connected users', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.instanceof(Mocks.Ravel.ApplicationError.Access);
        expect(result).to.be.null;
        expect(isMemberSpy).to.have.been.calledWith('ws_room:/test/1', 1);
        done();
      });
    });

    it('should callback with the members of the given room', function(done) {
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
      var isMemberSpy = sinon.stub(Mocks.Ravel.kvstore, 'sismember', function() {
        return true;
      });
      var members = [];
      var membersSpy = sinon.stub(Mocks.Ravel.kvstore, 'smembers', function(key, callback) {
        callback(null, members);
      });
      require('../../lib-cov/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
      Mocks.primus.emit('connection', Mocks.spark);
      Mocks.spark.emit('get connected users', {room:'/test/1'}, function(err, result) {
        expect(err).to.be.null;
        expect(result).to.equal(members);
        expect(isMemberSpy).to.have.been.calledWith('ws_room:/test/1', 1);
        expect(membersSpy).to.have.been.calledWith('ws_room:/test/1');
        done();
      });
    });
  });
});
