'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, redisClientStub, redisMock;

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
        redisClientStub = new (require('events').EventEmitter)(); //eslint-disable-line no-extra-parens
        redisClientStub.auth = function(){};
        redisClientStub.end = function(){};
        return redisClientStub;
      },
    };
    mockery.registerMock('redis', redisMock);
    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel(Ravel.log.NONE);
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
    describe('retryStrategy', function() {
      it('should return an error when redis refuses the connection', function(done) {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        expect(retryStrategy({error:{code:'ECONNREFUSED'}})).to.be.an.instanceof(Ravel.ApplicationError.General);
        done();
      });

      it('should return an error when the maximum number of retries is exceeded', function(done) {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        const options = {
          error:{code:'something'},
          attempt: Ravel.get('redis max retries') + 1
        };
        expect(retryStrategy(options)).to.be.an.instanceof(Ravel.ApplicationError.General);
        done();
      });

      it('should return the time to the next reconnect if the number of retries does not exceed the maximum', function(done) {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        const options = {
          error:{code:'something'},
          attempt: 1
        };
        expect(retryStrategy(options)).to.equal(100);
        done();
      });
    });
  });
});
