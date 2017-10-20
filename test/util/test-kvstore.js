'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, coreSymbols;

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    mockery.registerMock('redis', require('redis-mock'));
    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel(Ravel.log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis keepalive interval', 1000);

    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('util/kvstore', () => {
    describe('retryStrategy', () => {
      it('should return an error when redis refuses the connection', (done) => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        expect(retryStrategy({error: {code: 'ECONNREFUSED'}})).to.be.an.instanceof(Ravel.ApplicationError.General);
        done();
      });

      it('should return an error when the maximum number of retries is exceeded', (done) => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        Ravel[coreSymbols.parametersLoaded] = true;
        const options = {
          error: {code: 'something'},
          attempt: Ravel.get('redis max retries') + 1
        };
        expect(retryStrategy(options)).to.be.an.instanceof(Ravel.ApplicationError.General);
        done();
      });

      it('should return an error when the maximum number of retries is exceeded without a reason', (done) => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        Ravel[coreSymbols.parametersLoaded] = true;
        const options = {
          error: undefined,
          attempt: Ravel.get('redis max retries') + 1
        };
        expect(retryStrategy(options)).to.be.an.instanceof(Ravel.ApplicationError.General);
        done();
      });

      it('should return the time to the next reconnect if the number of retries does not exceed the maximum', (done) => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        Ravel[coreSymbols.parametersLoaded] = true;
        const options = {
          error: {code: 'something'},
          attempt: 1
        };
        expect(retryStrategy(options)).to.equal(100);
        done();
      });

      it('should return the time to the next reconnect if the number of retries does not exceed the maximum, and there was no reason for the error', (done) => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(Ravel);
        expect(retryStrategy).to.be.a('function');
        Ravel.set('redis max retries', 10);
        Ravel[coreSymbols.parametersLoaded] = true;
        const options = {
          error: undefined,
          attempt: 1
        };
        expect(retryStrategy(options)).to.equal(100);
        done();
      });
    });

    describe('kvstore', () => {
      let kvstore, clone;
      beforeEach(() => {
        Ravel[coreSymbols.parametersLoaded] = true;
        kvstore = require('../../lib/util/kvstore')(Ravel, true);
      });

      it('should prevent use of quit()', () => {
        expect(() => {
          kvstore.quit(() => {});
        }).to.throw(Ravel.ApplicationError.General);
      });

      it('should prevent use of qsubscribeuit()', () => {
        expect(() => {
          kvstore.subscribe('chan');
        }).to.throw(Ravel.ApplicationError.General);
      });

      it('should prevent use of psubscribe()', () => {
        expect(() => {
          kvstore.psubscribe('chan');
        }).to.throw(Ravel.ApplicationError.General);
      });

      it('should prevent use of unsubscribe()', () => {
        expect(() => {
          kvstore.unsubscribe('chan');
        }).to.throw(Ravel.ApplicationError.General);
      });

      it('should prevent use of punsubscribe()', () => {
        expect(() => {
          kvstore.punsubscribe('chan');
        }).to.throw(Ravel.ApplicationError.General);
      });

      describe('#clone()', () => {
        beforeEach(() => {
          clone = kvstore.clone();
        });
        it('should support the use of quit()', () => {
          expect(clone.quit).to.not.throw(Ravel.ApplicationError.General);
        });

        it('should support the use of qsubscribeuit()', () => {
          expect(clone.subscribe).to.not.throw(Ravel.ApplicationError.General);
        });

        it('should support the use of psubscribe()', () => {
          expect(clone.psubscribe).to.not.throw(Ravel.ApplicationError.General);
        });

        it('should support the use of unsubscribe()', () => {
          expect(clone.unsubscribe).to.not.throw(Ravel.ApplicationError.General);
        });

        it('should support the use of punsubscribe()', () => {
          expect(clone.punsubscribe).to.not.throw(Ravel.ApplicationError.General);
        });
      });
    });
  });
});
