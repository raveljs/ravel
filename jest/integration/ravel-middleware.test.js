describe('Ravel end-to-end middleware test', () => {
  let app;
  beforeEach(() => {
    process.removeAllListeners('unhandledRejection');
  });

  describe('basic application server consisting of routes', () => {
    beforeEach(async () => {
      const Ravel = require('../../lib/ravel');
      // stub Routes (miscellaneous routes, such as templated HTML content)
      const middleware = Ravel.Module.middleware;
      const pre = Ravel.Routes.before;
      const mapping = Ravel.Routes.mapping;

      @Ravel.Module('testm')
      class TestModule {
        @middleware('some-middleware')
        async someMiddleware (ctx, next) {
          ctx.body = 'Hello';
          await next();
        }
      }

      @Ravel.Routes('/api/routes')
      class TestRoutes {
        @pre('some-middleware')
        @mapping(Ravel.Routes.GET, '/')
        getHandler (ctx) {
          ctx.body += ' World!';
        }
      }

      app = new Ravel();
      app.set('log level', app.log.NONE);
      app.set('keygrip keys', ['mysecret']);

      app.load(TestModule, TestRoutes);
      await app.init();
    });

    it('@middleware should make a module method available as middleware for use with @before', () => {
      return request(app.callback)
        .get('/api/routes')
        .expect(200, 'Hello World!');
    });
  });
});
