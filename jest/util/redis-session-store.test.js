describe('util/rest', () => {
  let app, store;
  beforeEach(async () => {
    const Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
    await app.init();
    store = new (require('../../lib/util/redis_session_store'))(app);
  });

  describe('RedisSessionStore', () => {
    describe('#connected()', () => {
      it('should return the connection status of the internal kvstore', async () => {
        expect(store.connected).toBe(app.kvstore.connected);
      });
    });

    describe('#get()', () => {
      it('should return a Promise which resolves with a JSON object representing the user\'s session', () => {
        const session = {'username': 'smcintyre'};
        app.kvstore.set('koa:sess:1234', JSON.stringify(session));
        expect(store.get('koa:sess:1234')).resolves.toEqual(session);
      });

      it('should return a Promise which resolves with null if the specified session id does not exist', () => {
        expect(store.get('koa:sess:1234')).resolves.toEqual(null);
      });

      it('should return a Promise which rejects if redis calls back with an error', () => {
        const session = {'username': 'smcintyre'};
        const getError = new Error('getError');
        app.kvstore.get = jest.fn(function (key, cb) { cb(getError); });
        app.kvstore.set('koa:sess:1234', JSON.stringify(session));
        expect(store.get('koa:sess:1234')).rejects.toThrow(getError);
      });
    });

    describe('#set()', () => {
      it('should return a Promise which resolves after storing the user\'s session', () => {
        const session = {'username': 'smcintyre'};
        expect(store.set('koa:sess:1234', session)).resolves;
        expect(store.get('koa:sess:1234')).resolves.toEqual(session);
      });

      it('should return a Promise which resolves after storing the user\'s session with a ttl', () => {
        const session = {'username': 'smcintyre'};
        // setex from redis-mock sets a timeout, which stops test from exiting cleanly. Just stub it as set.
        app.kvstore.setex = jest.fn(function (key, ttl, value, cb) {
          app.kvstore.set(key, value, cb);
        });
        expect(store.set('koa:sess:1234', session, 1000 * 1000)).resolves;
        expect(store.get('koa:sess:1234')).resolves.toEqual(session);
        expect(app.kvstore.setex).toHaveBeenCalledWith('koa:sess:1234', 1000, JSON.stringify(session), expect.any(Function));
      });

      it('should return a Promise which rejects if redis calls back with an error', () => {
        const session = {'username': 'smcintyre'};
        const setError = new Error();
        app.kvstore.set = jest.fn(function (key, value, cb) { cb(setError); });
        expect(store.set('koa:sess:1234', session)).rejects.toThrow(setError);
      });

      it('should return a Promise which rejects if redis calls back with an error (ttl version)', () => {
        const session = {'username': 'smcintyre'};
        const setexError = new Error();
        app.kvstore.setex = jest.fn(function (key, value, ttl, cb) { cb(setexError); });
        expect(store.set('koa:sess:1234', session, 1000 * 1000)).rejects.toThrow(setexError);
      });
    });

    describe('#destroy()', () => {
      it('should remove a session from redis', () => {
        const session = {'username': 'smcintyre'};
        expect(store.set('koa:sess:1234', session)).resolves;
        expect(store.get('koa:sess:1234')).resolves.toEqual(session);
        expect(store.destroy('koa:sess:1234')).resolves;
        expect(store.get('koa:sess:1234')).resolves.toBe(null);
      });

      it('should return a Promise which rejects if redis calls back with an error (ttl version)', () => {
        const delError = new Error();
        app.kvstore.del = jest.fn(function (key, cb) { cb(delError); });
        expect(store.destroy('koa:sess:1234')).rejects.toThrow(delError);
      });
    });

    describe('#quit()', () => {
      it('should do nothing', () => {
        store.quit();
      });
    });

    describe('#end()', () => {
      it('should do nothing', () => {
        store.end();
      });
    });
  });
});
