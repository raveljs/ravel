describe('Ravel', () => {
  let Ravel, app;

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });

  describe('#reflect()', () => {
    it('should allow clients to retrieve metadata from Modules', async () => {
      jest.doMock('another', () => {}, {virtual: true});
      @Ravel.Module('test')
      @Ravel.inject('another')
      class Test {
        method () {}
      }
      app.load(Test);
      await app.init();
      expect(typeof app.reflect('test').registeredAt).toBe('number');
      const meta = app.reflect('test').metadata;
      expect(meta).toEqual({
        class: {
          'ravel': { 'instance': app },
          '@inject': { dependencies: ['another'] },
          '@role': { 'name': 'test', 'type': 'Module' },
          source: { 'name': 'test' }
        },
        method: {}
      });
    });

    it('should allow clients to retrieve metadata from Routes', async () => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      jest.doMock('middleware1', () => middleware1, {virtual: true});
      jest.doMock('middleware2', () => middleware2, {virtual: true});
      @Ravel.Routes('/app')
      @Ravel.Routes.before('middleware1')
      @Ravel.Routes.mapping(Ravel.Routes.GET, '/path', 404)
      class Stub {
        @Ravel.Routes.mapping(Ravel.Routes.PUT, '/path')
        @Ravel.Routes.before('middleware2')
        async pathHandler (ctx) {
          ctx.status = 200;
        }
      }
      app.load(Stub);
      await app.init();
      const meta = app.reflect('/app').metadata;
      expect(meta).toEqual({
        class: {
          'ravel': { 'instance': app },
          '@before': { middleware: ['middleware1'] },
          '@mapping': {
            'Symbol(get) /path': {
              path: '/path',
              verb: Ravel.Routes.GET,
              status: 404,
              suppressLog: undefined
            }
          },
          '@role': {
            name: '/app',
            type: 'Routes'
          }
        },
        method: {
          pathHandler: {
            '@before': { middleware: ['middleware2'] },
            '@mapping': {
              info: {
                endpoint: Stub.prototype.pathHandler,
                path: '/path',
                verb: Ravel.Routes.PUT,
                suppressLog: undefined
              }
            }
          }
        }
      });
    });

    it('should allow clients to retrieve metadata from Resources', async () => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      jest.doMock('middleware1', () => middleware1, {virtual: true});
      jest.doMock('middleware2', () => middleware2, {virtual: true});
      const Resource = Ravel.Resource;
      const before = Resource.before;

      @Resource('/api')
      @before('middleware1')
      class Stub {
        @before('middleware2')
        async get (ctx) {
          ctx.status = 200;
        }
      }
      app.load(Stub);
      await app.init();
      const meta = app.reflect('/api').metadata;

      expect(meta).toEqual({
        class: {
          'ravel': { 'instance': app },
          '@before': { middleware: ['middleware1'] },
          '@role': { name: '/api', type: 'Resource' },
          '@mapping': {
            'Symbol(get) /': { verb: Ravel.Routes.GET, path: '/', status: 501, suppressLog: true },
            'Symbol(put) /': { verb: Ravel.Routes.PUT, path: '/', status: 501, suppressLog: true },
            'Symbol(delete) /': { verb: Ravel.Routes.DELETE, path: '/', status: 501, suppressLog: true },
            'Symbol(post) /': { verb: Ravel.Routes.POST, path: '/', status: 501, suppressLog: true },
            'Symbol(put) /:id': { verb: Ravel.Routes.PUT, path: '/:id', status: 501, suppressLog: true },
            'Symbol(delete) /:id': { verb: Ravel.Routes.DELETE, path: '/:id', status: 501, suppressLog: true }
          }
        },
        method: {
          get: {
            '@before': { middleware: ['middleware2'] },
            '@mapping': {
              info: {
                endpoint: meta.method.get['@mapping'].info.endpoint,
                path: '/:id',
                verb: Ravel.Routes.GET,
                suppressLog: undefined
              }
            }
          }
        }
      });
    });

    it('should throw an $err.NotFound if the specified path is not a known Ravel component', async () => {
      await app.init();
      function test () {
        app.reflect('test');
      }
      expect(test).toThrow(app.$err.NotFound);
    });
  });

  describe('#knownComponents()', () => {
    it('should respond with an Array<String> of known class file paths', async () => {
      const inject = Ravel.inject;
      jest.doMock('another', () => {}, {virtual: true});
      @Ravel.Module('test')
      @inject('another')
      class Stub {
        method () {}
      }

      const Routes = Ravel.Routes;
      const before = Routes.before;
      const mapping = Routes.mapping;
      @Routes('/app')
      @before('middleware1')
      @mapping(Routes.GET, '/path', 404)
      class Stub2 {
        @mapping(Routes.PUT, '/path')
        @before('middleware2')
        async pathHandler (ctx) {
          ctx.status = 200;
        }
      }

      app.load(Stub, Stub2);
      await app.init();
      const knownComponents = app.knownComponents();
      expect(knownComponents).toEqual(['test', '/app']);
    });
  });
});
