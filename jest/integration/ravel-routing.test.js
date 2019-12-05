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

        @mapping(Ravel.Routes.GET, '/another')
        yetAnotherHandler (ctx) {
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
        .expect(204);
      expect(callCounter.length).toEqual(1);
    });

    it('The most specific route should be chosen', async () => {
      await request(app.callback)
        .get('/first/some')
        .expect(204);
      expect(callCounter).toEqual('a');
    });

    it('The most specific route should be chosen, regardless of declaration order', async () => {
      await request(app.callback)
        .get('/first/some')
        .expect(204);
      await request(app.callback)
        .get('/second/some')
        .expect(204);
      expect(callCounter).toEqual('aa');
    });

    it('Should return a list of supported methods when queried with OPTIONS', async () => {
      await request(app.callback)
        .options('/first/some')
        .expect(200)
        .expect('Allow', 'OPTIONS, GET');
    });

    it('Should be fast', async () => {
      const cb = app.callback;
      const p = [];
      const start = process.hrtime.bigint();
      for (let i = 0; i < 1000; i++) {
        p.push(request(cb).get('/second/another').expect(204));
      }
      await Promise.all(p);
      const end = process.hrtime.bigint();
      const perReq = (end - start) / BigInt(1000); // eslint-disable-line no-undef
      console.log(`Nanoseconds per request: ${perReq}`);
    }, 10000);
  });
});
