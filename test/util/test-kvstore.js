'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var sinon = require('sinon');

var testPrefix = 'test-prefix-';
var Ravel, kvstore, redisClientStub;

describe('Ravel', function() {

  beforeEach(function(done) {
    redisClientStub = {
      auth: function(){}
    };
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    mockery.registerMock('redis', {
      createClient: function() {
        return redisClientStub;
      },
    });
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis password', 'password');

    kvstore = require('../../lib-cov/util/kvstore')(testPrefix, Ravel);

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.disable();
    done();
  });

  describe('util/kvstore', function() {

    describe('#expire()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.expire = function(){};
        var spy = sinon.stub(redisClientStub, 'expire');
        kvstore.expire('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#set()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.set = function(){};
        var spy = sinon.stub(redisClientStub, 'set');
        kvstore.set('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#setnx()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.setnx = function(){};
        var spy = sinon.stub(redisClientStub, 'setnx');
        kvstore.setnx('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#setex()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.setex = function(){};
        var spy = sinon.stub(redisClientStub, 'setex');
        kvstore.setex('key', 1, 2);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1, 2);
        done();
      });
    });

    describe('#get()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.get = function(){};
        var spy = sinon.stub(redisClientStub, 'get');
        kvstore.get('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#del()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.del = function(){};
        var spy = sinon.stub(redisClientStub, 'del');
        kvstore.del('key');
        expect(spy).to.have.been.calledWith(testPrefix+'key');
        done();
      });
    });

    describe('#sadd()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.sadd = function(){};
        var spy = sinon.stub(redisClientStub, 'sadd');
        kvstore.sadd('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#srem()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.srem = function(){};
        var spy = sinon.stub(redisClientStub, 'srem');
        kvstore.srem('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#sismember()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.sismember = function(){};
        var spy = sinon.stub(redisClientStub, 'sismember');
        kvstore.sismember('key', 1, 2);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1, 2);
        done();
      });
    });

    describe('#smembers()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.smembers = function(){};
        var spy = sinon.stub(redisClientStub, 'smembers');
        kvstore.smembers('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#rpush()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.rpush = function(){};
        var spy = sinon.stub(redisClientStub, 'rpush');
        kvstore.rpush('key', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1);
        done();
      });
    });

    describe('#lrange()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.lrange = function(){};
        var spy = sinon.stub(redisClientStub, 'lrange');
        kvstore.lrange('key', 1, 2, 3);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1, 2, 3);
        done();
      });
    });

    describe('#keys()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.keys = function(){};
        var spy = sinon.stub(redisClientStub, 'keys');
        kvstore.keys('key*', 1);
        expect(spy).to.have.been.calledWith(testPrefix+'key*', 1);
        done();
      });
    });

    describe('#zadd()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.zadd = function(){};
        var spy = sinon.stub(redisClientStub, 'zadd');
        kvstore.zadd([1,2,3], 4);
        expect(spy).to.have.been.calledWith([testPrefix+1,2,3], 4);
        done();
      });

      it('should callback with Ravel.ApplicationError.IllegalValue if the first argument has less than three items', function(done) {
        redisClientStub.zadd = function(){};
        var spy = sinon.stub(redisClientStub, 'zadd');
        kvstore.zadd([1,2], function(err, result) {
          expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
          expect(result).to.be.null;
          done();
        });
        expect(spy).to.not.have.been.called;
      });
    });

    describe('#zrangebyscore()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.zrangebyscore = function(){};
        var spy = sinon.stub(redisClientStub, 'zrangebyscore');
        kvstore.zrangebyscore([1,2,3], 4);
        expect(spy).to.have.been.calledWith([testPrefix+1,2,3], 4);
        done();
      });

      it('should callback with Ravel.ApplicationError.IllegalValue if the first argument has less than three items', function(done) {
        redisClientStub.zrangebyscore = function(){};
        var spy = sinon.stub(redisClientStub, 'zrangebyscore');
        kvstore.zrangebyscore([1,2], function(err, result) {
          expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
          expect(result).to.be.null;
          done();
        });
        expect(spy).to.not.have.been.called;
      });
    });

    describe('#zremrangebyscore()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.zremrangebyscore = function(){};
        var spy = sinon.stub(redisClientStub, 'zremrangebyscore');
        kvstore.zremrangebyscore('key', 1, 2, 3);
        expect(spy).to.have.been.calledWith(testPrefix+'key', 1, 2, 3);
        done();
      });
    });

    describe('#flushdb()', function() {
      it('should pass all arguments on to the actual redis client, prefixing the key appropriately.', function(done) {
        redisClientStub.flushdb = function(){};
        var spy = sinon.stub(redisClientStub, 'flushdb');
        kvstore.flushdb();
        expect(spy).to.have.been.calledWith();
        done();
      });
    });
  });
});
