describe('Ravel', () => {
  const Metadata = require('../../../lib/util/meta');
  let app, middleware, Ravel, Module;

  describe('@middleware()', () => {
    beforeEach(() => {
      Ravel = require('../../../lib/ravel');
      Module = Ravel.Module;
      app = new Ravel();
      app.set('keygrip keys', ['mysecret']);
      app.set('log level', app.$log.NONE);
      middleware = Module.middleware;
    });

    afterEach(() => {
      jest.resetModules();
    });

    it('should register a Module method as injectable middleware', () => {
      @Ravel.Module('test')
      class Stub1 {
        @middleware('some-middleware')
        async someMiddleware () {}
      }
      const middlewareMeta = Metadata.getClassMetaValue(Stub1.prototype, '@middleware', 'some-middleware');
      expect(typeof middlewareMeta).toBe('object');
      expect(typeof middlewareMeta.fn).toBe('function');
      expect(middlewareMeta.isFactory).toBeFalsy();
    });

    it('should register a Module method as injectable middleware factory', () => {
      @Ravel.Module('test')
      class Stub1 {
        @middleware('some-middleware', true)
        someMiddlewareFactory (one, two) {
          return async function () {};
        }
      }
      const middlewareMeta = Metadata.getClassMetaValue(Stub1.prototype, '@middleware', 'some-middleware');
      expect(typeof middlewareMeta).toBe('object');
      expect(typeof middlewareMeta.fn).toBe('function');
      expect(middlewareMeta.fn.length).toBe(2);
      expect(middlewareMeta.isFactory).toBeTruthy();
    });

    it('should throw a DuplicateEntry error when middleware is registered with the same name as a module', async () => {
      @Ravel.Module('some-middleware')
      class Stub1 {
        @middleware('some-middleware')
        async someMiddleware () {}
      }
      await expect((async () => {
        app.load(Stub1);
        await app.init();
      })()).rejects.toThrow(app.$err.DuplicateEntry);
    });
  });
});
