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
      const metavalue = Metadata.getClassMetaValue(Stub1.prototype, '@middleware', 'some-middleware');
      expect(typeof metavalue).toBe('object');
      expect(typeof metavalue.fn).toBe('function');
    });

    it('should register a Module method as injectable middleware with options', () => {
      @Ravel.Module('test')
      class Stub1 {
        @middleware('some-middleware', { someOption: true })
        async someMiddleware () {}
      }
      const metavalue = Metadata.getClassMetaValue(Stub1.prototype, '@middleware', 'some-middleware');
      expect(typeof metavalue).toBe('object');
      expect(typeof metavalue.fn).toBe('function');
      expect(metavalue.options).toEqual({ someOption: true });
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
