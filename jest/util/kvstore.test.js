
describe('Ravel', () => {
  let app;
  beforeEach(async () => {
    const Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });

  describe('util/kvstore', () => {
    describe('retryStrategy', () => {
      it('should return an error when redis refuses the connection', async () => {
        await app.init();
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(app);
        expect(typeof retryStrategy).toBe('function');
        expect(retryStrategy({error: {code: 'ECONNREFUSED'}})).toBeInstanceOf(app.$err.General);
      });

      it('should return an error when the maximum number of retries is exceeded', async () => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(app);
        app.set('redis max retries', 10);
        await app.init();
        const options = {
          error: {code: 'something'},
          attempt: app.get('redis max retries') + 1
        };
        expect(retryStrategy(options)).toBeInstanceOf(app.$err.General);
      });

      it('should return an error when the maximum number of retries is exceeded without a reason', async () => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(app);
        app.set('redis max retries', 10);
        await app.init();
        const options = {
          error: undefined,
          attempt: app.get('redis max retries') + 1
        };
        expect(retryStrategy(options)).toBeInstanceOf(app.$err.General);
      });

      it('should return the time to the next reconnect if the number of retries does not exceed the maximum', async () => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(app);
        app.set('redis max retries', 10);
        await app.init();
        const options = {
          error: {code: 'something'},
          attempt: 1
        };
        expect(retryStrategy(options)).toBe(100);
      });

      it('should return the time to the next reconnect if the number of retries does not exceed the maximum, and there was no reason for the error', async () => {
        const retryStrategy = require('../../lib/util/kvstore').retryStrategy(app);
        app.set('redis max retries', 10);
        await app.init();
        const options = {
          error: undefined,
          attempt: 1
        };
        expect(retryStrategy(options)).toBe(100);
      });
    });

    describe('kvstore', () => {
      let clone;
      beforeEach(async () => {
        await app.init();
      });

      it('should prevent use of quit()', () => {
        expect(() => {
          app.kvstore.quit(() => {});
        }).toThrow(app.$err.General);
      });

      it('should prevent use of qsubscribeuit()', () => {
        expect(() => {
          app.kvstore.subscribe('chan');
        }).toThrow(app.$err.General);
      });

      it('should prevent use of psubscribe()', () => {
        expect(() => {
          app.kvstore.psubscribe('chan');
        }).toThrow(app.$err.General);
      });

      it('should prevent use of unsubscribe()', () => {
        expect(() => {
          app.kvstore.unsubscribe('chan');
        }).toThrow(app.$err.General);
      });

      it('should prevent use of punsubscribe()', () => {
        expect(() => {
          app.kvstore.punsubscribe('chan');
        }).toThrow(app.$err.General);
      });

      describe('#clone()', () => {
        beforeEach(() => {
          clone = app.kvstore.clone();
        });
        it('should support the use of quit()', () => {
          expect(clone.quit).not.toThrow(app.$err.General);
        });

        it('should support the use of qsubscribeuit()', () => {
          expect(clone.subscribe).not.toThrow(app.$err.General);
        });

        it('should support the use of psubscribe()', () => {
          expect(clone.psubscribe).not.toThrow(app.$err.General);
        });

        it('should support the use of unsubscribe()', () => {
          expect(clone.unsubscribe).not.toThrow(app.$err.General);
        });

        it('should support the use of punsubscribe()', () => {
          expect(clone.punsubscribe).not.toThrow(app.$err.General);
        });
      });
    });
  });
});
