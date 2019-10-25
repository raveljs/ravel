describe('Ravel end-to-end routing test', () => {
  let app, callCounter;

  describe('basic application server consisting of routes', () => {
    beforeEach(async () => {
      const Ravel = require('../../lib/ravel');
      const mapping = Ravel.Routes.mapping;
      callCounter = '';

      @Ravel.Routes('/first')
      class TestRoutes {
        @mapping(Ravel.Routes.GET, '/some')
        getHandler (ctx) {
          callCounter += 'a';
          ctx.body = '';
        }

        @mapping(Ravel.Routes.GET, '/:some')
        anotherHandler (ctx) {
          callCounter += 'b';
          ctx.body = '';
        }
      }

      @Ravel.Routes('/second')
      class TestMoreRoutes {
        @mapping(Ravel.Routes.GET, '/:some')
        getHandler (ctx) {
          callCounter += 'b';
          ctx.body = '';
        }

        @mapping(Ravel.Routes.GET, '/some')
        anotherHandler (ctx) {
          callCounter += 'a';
          ctx.body = '';
        }
      }

      app = new Ravel();
      app.set('log level', app.$log.NONE);
      app.set('keygrip keys', ['mysecret']);

      app.load(TestRoutes, TestMoreRoutes);
      await app.init();
    });

    it('Only one matching route should be executed', async () => {
      await request(app.callback)
        .get('/first/some')
        .expect(500);
      expect(callCounter.length).toEqual(1);
    });

    it('The most specific route should be chosen', async () => {
      await request(app.callback)
        .get('/first/some')
        .expect(500);
      expect(callCounter).toEqual('a');
    });

    it('The most specific route should be chosen, regardless of declaration order', async () => {
      await request(app.callback)
        .get('/first/some')
        .expect(500);
      await request(app.callback)
        .get('/second/some')
        .expect(500);
      expect(callCounter).toEqual('aa');
    });
  });
});
