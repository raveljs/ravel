'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;

let Ravel, broadcast, roomResolver, rooms, primus, primusRoom, redisClientStub;

describe('ws/util/broadcast', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    //simple redis mock
    mockery.registerMock('redis', {
      createClient: function() {
        return redisClientStub;
      },
    });
    redisClientStub = {
      auth: function(){},
      select: function(){}
    };
    Ravel = new require('../../../lib/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis password', 'password');
    rooms = {};
    rooms['/entites/users/:userId'] = {
      name: '/entites/users/:userId',
      params: ['userId'],
      regex: /\/entities\/users\/(\w+)/,
      authorize: function(){}
    };
    roomResolver = require('../../../lib/ws/util/websocket_room_resolver')(rooms);
    primusRoom = {
      send: function() {}
    };
    primus = {
      room: function() {
        return primusRoom;
      }
    };
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    rooms = undefined;
    roomResolver = undefined;
    broadcast = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#emit()', function() {
    it('should subscribe to redis messages on the channel \'tapestry_broadcast:\'', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.on = new EventEmitter().on;
      const spy = sinon.spy(redisClientStub, 'subscribe');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      expect(spy).to.have.been.calledWith('tapestry_broadcast:');
      done();
    });

    it('should not emit messages to redis.publish if the room does not exist', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.on = new EventEmitter().on;
      const spy = sinon.spy(redisClientStub, 'publish');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      const payload = {};
      broadcast.emit('/entities/things/1', 'test event', payload, true);
      expect(spy).to.not.have.been.called;
      done();
    });

    it('should emit messages to redis.publish if the room exists', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.on = new EventEmitter().on;
      const spy = sinon.spy(redisClientStub, 'publish');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      const payload = {};
      broadcast.emit('/entities/users/1', 'test event', payload, true);
      expect(spy).to.have.been.calledWith('tapestry_broadcast:', JSON.stringify({
        room: '/entities/users/1',
        msg: {
          event: 'test event',
          data: payload
        }
      }));
      done();
    });

    it('should support caching messages in redis', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.zadd = function(args, callback) {
        callback();
      };
      redisClientStub.zremrangebyscore = function(a, b, c, callback) {
        callback();
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.kvstore = redisClientStub;
      Ravel.set('websocket message cache time', 1000);
      const zaddSpy = sinon.spy(redisClientStub, 'zadd');
      const zremrangebyscoreSpy = sinon.spy(redisClientStub, 'zremrangebyscore');
      sinon.stub(Date, 'now', function() {
        return 1234567890; //fake timestamp
      });
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      const payload = {};
      broadcast.emit('/entities/users/1', 'test event', payload, false);
      const message = {
        event: 'test event',
        data: payload
      };
      expect(zaddSpy).to.have.been.calledWithMatch(
        ['ravel_broadcast_emit:/entities/users/1',
        String(Date.now()),
        JSON.stringify(message)]);
      expect(zremrangebyscoreSpy).to.have.been.calledWith(
        'ravel_broadcast_emit:/entities/users/1',
        '-inf',
        String(Date.now()-Ravel.get('websocket message cache time'))
      );
      Date.now.restore();
      done();
    });

    it('should log a message if message caching fails', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      const error = new Error();
      redisClientStub.zadd = function(args, callback) {
        callback(error);
      };
      redisClientStub.zremrangebyscore = function(a, b, c, callback) {
        callback();
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.kvstore = redisClientStub;
      const spy = sinon.spy(Ravel.Log, 'error');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      const payload = {};
      broadcast.emit('/entities/users/1', 'test event', payload, false);
      expect(spy).to.have.been.calledWith(error);
      done();
    });

    it('should log a message if cache pruning fails', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.zadd = function(args, callback) {
        callback();
      };
      const error = new Error();
      redisClientStub.zremrangebyscore = function(a, b, c, callback) {
        callback(error);
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.kvstore = redisClientStub;
      const spy = sinon.spy(Ravel.Log, 'error');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      const payload = {};
      broadcast.emit('/entities/users/1', 'test event', payload, false);
      expect(spy).to.have.been.calledWith(error);
      done();
    });

    it('should emit messages to primus.room when they arrive via redis.subscribe', function(done) {
      const roomSpy = sinon.spy(primus, 'room');
      const sendSpy = sinon.spy(primusRoom, 'send');
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.on = function(event, callback) {
        const message = {
          room: '/user/1',
          msg: {
            event: 'test event',
            data: {}
          }
        };
        callback('tapestry_broadcast:', JSON.stringify(message));
        expect(roomSpy).to.have.been.calledWith('/user/1');
        expect(sendSpy).to.have.been.calledWith('broadcast', message.msg);
        done();
      };
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
    });
  });

  describe('#getMissedMessages()', function() {
    it('should callback with a Ravel.ApplicationError.RangeOutOfBounds if the current time is outside the cache window', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.zrangebyscore = function(args, callback) {
        callback();
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.set('websocket message cache time', 1000);
      sinon.stub(Date, 'now', function() {
        return 2000000; //fake timestamp
      });
      const zrangebyscoreSpy = sinon.spy(redisClientStub, 'zrangebyscore');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      broadcast.getMissedMessages('/user/1', 2, function(err, messages) {
        expect(zrangebyscoreSpy).to.not.have.been.called;
        expect(messages).to.be.not.ok;
        expect(err).to.be.instanceof(Ravel.ApplicationError.RangeOutOfBounds);
        Date.now.restore();
        done();
      });
    });

    it('should callback with missed messages from the given room if the current time is inside the cache window', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      const messageCache = [];
      redisClientStub.zrangebyscore = function(args, callback) {
        callback(null, messageCache);
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.kvstore = redisClientStub;
      Ravel.set('websocket message cache time', 1000);
      sinon.stub(Date, 'now', function() {
        return 2000000; //fake timestamp
      });
      const zrangebyscoreSpy = sinon.spy(redisClientStub, 'zrangebyscore');
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      broadcast.getMissedMessages('/user/1', 2000000-1, function(err, messages) {
        expect(err).to.be.null;
        expect(zrangebyscoreSpy).to.have.been.calledWith(['ravel_broadcast_emit:/user/1', 2000000-1, '+inf']);
        expect(messages).to.equal(messageCache);
        Date.now.restore();
        done();
      });
    });

    it('should callback with Error when the missed message cache cannot be retrieved from redis', function(done) {
      redisClientStub.publish = function() {};
      redisClientStub.subscribe = function() {};
      redisClientStub.zrangebyscore = function(args, callback) {
        callback(new Error());
      };
      redisClientStub.on = new EventEmitter().on;
      Ravel.kvstore = redisClientStub;
      Ravel.set('websocket message cache time', 1000);
      sinon.stub(Date, 'now', function() {
        return 2000000; //fake timestamp
      });
      broadcast = require('../../../lib/ws/util/broadcast')(Ravel, primus, roomResolver);
      broadcast.getMissedMessages('/user/1', 2000000-1, function(err, messages) {
        expect(err).to.be.instanceof(Error);
        expect(messages).to.be.not.ok;
        Date.now.restore();
        done();
      });
    });
  });
});
