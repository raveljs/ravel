'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const sinon = require('sinon');

let Ravel, kvstore, redisClientStub, redisMock;

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
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');

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
        kvstore = require('../../lib/util/kvstore')(Ravel);
        expect(kvstore).to.have.a.property('auth').that.is.a('function');

        const origKvstoreAuth = kvstore.auth;
        const spy = sinon.spy(redisMock, 'createClient');
        //fake disconnection
        redisClientStub.emit('end');
        expect(spy).to.have.been.calledOnce;
        expect(kvstore.auth).to.not.equal(origKvstoreAuth);
        done();
      });

      it('should support auth', function(done) {
        Ravel.set('redis password', 'password');
        kvstore = require('../../lib/util/kvstore')(Ravel);
        expect(kvstore).to.have.a.property('auth').that.is.a('function');

        const origKvstoreAuth = kvstore.auth;
        const spy = sinon.spy(redisMock, 'createClient');
        //fake disconnection
        redisClientStub.emit('end');
        expect(spy).to.have.been.calledOnce;
        expect(kvstore.auth).to.not.equal(origKvstoreAuth);
        done();
      });
    });
  });
});
