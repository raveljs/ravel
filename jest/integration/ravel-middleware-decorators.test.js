describe('Ravel end-to-end middleware decorators test', () => {
  let app;

  describe('basic application server consisting of routes', () => {
    beforeEach(async () => {
      const Ravel = require('../../lib/ravel');
      // stub Routes (miscellaneous routes, such as templated HTML content)
      const middleware = Ravel.Module.middleware;
      const mapping = Ravel.Routes.mapping;
      const someMiddleware = Ravel.Routes.createMiddlewareDecorator('some-middleware');
      const capitalize = Ravel.Routes.createMiddlewareDecorator('capitalize');

      @Ravel.Module('testm')
      class TestModule {
        @middleware('some-middleware')
        async someMiddleware (ctx, next) {
          ctx.body = 'Hello';
          await next();
        }

        @middleware('capitalize', { acceptsParams: true })
        capitalizeMiddleware ({ shouldCapitalize }) {
          return async (ctx, next) => {
            if (shouldCapitalize === 'true') {
              ctx.body = ctx.body.toUpperCase();
            }
            await next();
          };
        }
      }

      @Ravel.Routes('/api/routes')
      class TestRoutes {
        @someMiddleware()
        @capitalize({ shouldCapitalize: 'true' })
        @mapping(Ravel.Routes.GET, '/')
        getHandler (ctx) {
          ctx.body += ' World!';
        }
      }

      app = new Ravel();
      app.set('log level', app.$log.INFO);
      app.set('keygrip keys', ['mysecret']);

      app.load(TestModule, TestRoutes);
      await app.init();
    });

    it('createMiddlewareDecorator should attach the named @middleware to the route handler', () => {
      return request(app.callback)
        .get('/api/routes')
        .expect(200, 'HELLO World!');
    });
  });
});
