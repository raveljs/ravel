describe('Ravel', () => {
  const Metadata = require('../../../lib/util/meta');
  let app, cache, cacheSpy, cacheMiddleware, Routes;
  describe('@cache()', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.restoreAllMocks();
      cacheSpy = jest.fn();
      cacheMiddleware = async (ctx, next) => {
        cacheSpy();
        await next();
      };
      jest.doMock('../../../lib/util/response_cache', () => class {
        middleware () { return cacheMiddleware; }
      });
      const Ravel = require('../../../lib/ravel');
      Routes = Ravel.Routes;
      app = new Ravel();
      app.set('keygrip keys', ['mysecret']);
      app.set('log level', app.log.NONE);
      cache = Routes.cache;
    });

    it('should throw an ApplicationError.IllegalValue if a non-object type is passed to @cache', () => {
      const test = () => {
        @cache('hello world')
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow(app.ApplicationError.IllegalValue);
    });

    it('should indicate that default options should be used when applied with no arguments', () => {
      class Stub1 {
        @cache
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).toEqual({});
    });

    it('should indicate that default options should be used when applied with no arguments', () => {
      class Stub1 {
        @cache()
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).toEqual({});
    });

    it('should store options when used with an options argument', () => {
      class Stub1 {
        @cache({expire: 60})
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).toEqual({expire: 60});
    });

    it('should be available at the class-level as well, indicating that default options should be used when applied with no arguments', () => {
      @cache
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).toEqual({});
    });

    it('should be available at the class-level as well, indicating that default options should be used when applied without an argument', () => {
      @cache()
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).toEqual({});
    });

    it('should be available at the class-level as well, indicating which options should be used when applied with arguments', () => {
      @cache({expire: 60})
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).toEqual({expire: 60});
    });

    it('should insert caching middleware before Route handlers (method-level)', async () => {
      @Routes('/app/path')
      class Stub {
        @Routes.mapping(Routes.GET, '')
        @cache
        handler () {}
      }
      app.load(Stub);
      await app.init();
      await request(app.callback).get('/app/path');
      expect(cacheSpy).toHaveBeenCalledTimes(1);
    });

    it('should insert caching middleware before Route handlers (class-level)', async () => {
      @Routes('/app/another/path')
      @cache({expire: 60})
      class Stub2 {
        @Routes.mapping(Routes.GET, '')
        handler () {}
      }
      app.load(Stub2);
      await app.init();
      await request(app.callback).get('/app/another/path');
      expect(cacheSpy).toHaveBeenCalledTimes(1);
    });
  });
});
