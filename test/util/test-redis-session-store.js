'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
chai.use(require('sinon-chai'));
const sinon = require('sinon');

let Ravel, RedisMock, store;

describe('util/rest', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    RedisMock = require('redis-mock');
    mockery.registerMock('redis', RedisMock);
    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel('NONE');
    Ravel.kvstore = RedisMock.createClient();
    Ravel.kvstore.connected = true;
    store = new (require('../../lib/util/redis_session_store'))(Ravel);
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    RedisMock = undefined;
    store = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('RedisSessionStore', () => {
    describe('#connected()', () => {
      it('should return true iff the redis client is connected', (done) => {
        Ravel.kvstore.connected = true;
        expect(store.connected).to.be.true;
        Ravel.kvstore.connected = false;
        expect(store.connected).to.be.false;
        done();
      });
    });

    describe('#get()', () => {
      it('should return a Promise which resolves with a JSON object representing the user\'s session', () => {
        const session = {'username': 'smcintyre'};
        Ravel.kvstore.set('koa:sess:1234', JSON.stringify(session));
        return expect(store.get('koa:sess:1234')).to.eventually.deep.equal(session);
      });

      it('should return a Promise which resolves with null if the specified session id does not exist', () => {
        return expect(store.get('koa:sess:1234')).to.eventually.equal(null);
      });

      it('should return a Promise which rejects if redis calls back with an error', () => {
        const session = {'username': 'smcintyre'};
        const getError = new Error('getError');
        sinon.stub(Ravel.kvstore, 'get').callsFake(function (key, cb) { cb(getError); });
        Ravel.kvstore.set('koa:sess:1234', JSON.stringify(session));
        return expect(store.get('koa:sess:1234')).to.be.rejectedWith(getError);
      });
    });

    describe('#set()', () => {
      it('should return a Promise which resolves after storing the user\'s session', () => {
        const session = {'username': 'smcintyre'};
        return Promise.all([
          expect(store.set('koa:sess:1234', session)).to.be.fulfilled,
          expect(store.get('koa:sess:1234')).to.eventually.deep.equal(session)
        ]);
      });

      it('should return a Promise which resolves after storing the user\'s session with a ttl', () => {
        const session = {'username': 'smcintyre'};
        // setex from redis-mock sets a timeout, which stops test from exiting cleanly. Just stub it as set.
        const setexSpy = sinon.stub(Ravel.kvstore, 'setex').callsFake(function (key, ttl, value, cb) {
          Ravel.kvstore.set(key, value, cb);
        });
        return Promise.all([
          expect(store.set('koa:sess:1234', session, 1000 * 1000)).to.be.fulfilled,
          expect(store.get('koa:sess:1234')).to.eventually.deep.equal(session)
        ]).then(() => {
          // redis mock doesn't support ttls, so we just check to see if setex was called
          expect(setexSpy).to.have.been.calledWith('koa:sess:1234', 1000, JSON.stringify(session));
        });
      });

      it('should return a Promise which rejects if redis calls back with an error', () => {
        const session = {'username': 'smcintyre'};
        const setError = new Error();
        sinon.stub(Ravel.kvstore, 'set').callsFake(function (key, value, cb) { cb(setError); });
        return expect(store.set('koa:sess:1234', session)).to.be.rejectedWith(setError);
      });

      it('should return a Promise which rejects if redis calls back with an error (ttl version)', () => {
        const session = {'username': 'smcintyre'};
        const setexError = new Error();
        sinon.stub(Ravel.kvstore, 'setex').callsFake(function (key, value, ttl, cb) { cb(setexError); });
        return expect(store.set('koa:sess:1234', session, 1000 * 1000)).to.be.rejectedWith(setexError);
      });
    });

    describe('#destroy()', () => {
      it('should remove a session from redis', () => {
        const session = {'username': 'smcintyre'};
        return Promise.all([
          expect(store.set('koa:sess:1234', session)).to.be.fulfilled,
          expect(store.get('koa:sess:1234')).to.eventually.deep.equal(session),
          expect(store.destroy('koa:sess:1234')).to.be.fulfilled,
          expect(store.get('koa:sess:1234')).to.eventually.equal(null)
        ]);
      });

      it('should return a Promise which rejects if redis calls back with an error (ttl version)', () => {
        const delError = new Error();
        sinon.stub(Ravel.kvstore, 'del').callsFake(function (key, cb) { cb(delError); });
        return expect(store.destroy('koa:sess:1234')).to.be.rejectedWith(delError);
      });
    });

    describe('#quit()', () => {
      it('should do nothing', (done) => {
        store.quit();
        done();
      });
    });

    describe('#end()', () => {
      it('should do nothing', (done) => {
        store.end();
        done();
      });
    });
  });
});
