'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var sinon = require('sinon');

var Ravel, kvstore, redisClientStub, redisMock;

describe('Ravel', function() {

  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    redisMock = {
      createClient: function() {
        redisClientStub = new (require('events').EventEmitter)();
        redisClientStub.auth = function(){};
        redisClientStub.end = function(){};
        return redisClientStub;
      },
    };
    mockery.registerMock('redis', redisMock);
    Ravel = new require('../../lib/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis password', 'password');

    kvstore = require('../../lib/util/kvstore')(Ravel);

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('util/kvstore', function() {

    describe('reconnection', function() {
      it('should seamlessly create a new redis client when an \'end\' event is received from the original', function(done) {
        expect(kvstore).to.have.a.property('auth').that.is.a('function');

        var origKvstoreAuth = kvstore.auth;
        var spy = sinon.spy(redisMock, 'createClient');
        //fake disconnection
        redisClientStub.emit('end');
        expect(spy).to.have.been.calledOnce;
        expect(kvstore.auth).to.not.equal(origKvstoreAuth);
        done();
      });
    });
  });
});
