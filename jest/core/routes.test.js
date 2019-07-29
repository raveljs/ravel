describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });

  describe('#routes', () => {
    it('should throw an exception if called before app.init()', () => {
      @Ravel.Routes('/')
      class Test {}
      app.load(Test);
      expect(() => app.routes('/')).toThrow(app.$err.General);
    });
  });

  // Testing how Ravel loads routes
  describe('#load', () => {
    describe('@Routes', () => {
      it('should register Routes modules for instantiation and initialization in Ravel.init', async () => {
        const spy = jest.fn();
        @Ravel.Routes('/')
        class Test {
          method () {
            spy();
          }
        }
        app.load(Test);
        await app.init();
        expect(app.routes('/')).toBeDefined();
        app.routes('/').method();
        expect(spy).toHaveBeenCalled();
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a routes module without a basePath', async () => {
        expect(() => {
          @Ravel.Routes
          class Test {}
          app.load(Test);
        }).toThrowError(app.$err.IllegalValue);
      });

      it('should throw a Ravel.$err.DuplicateEntry error when clients attempt to register multiple routes modules with the same basePath', () => {
        @Ravel.Routes('/')
        class Test {}
        @Ravel.Routes('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.$err.DuplicateEntry);
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a routes module without appropriate decoration', async () => {
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.$err.IllegalValue);
      });

      it('should load and instantiate routes modules, performing dependency injection of core services', async () => {
        @Ravel.Routes('/')
        @Ravel.inject('$app', '$err', '$log', '$kvstore', '$params', '$db')
        class Test {
          constructor ($app, $err, $log, $kvstore, $params, $db) {
            this.$app = $app;
            this.$err = $err;
            this.$log = $log;
            this.$kvstore = $kvstore;
            this.$params = $params;
            this.$db = $db;
          }
        }
        app.load(Test);
        await app.init();
        const instance = app.routes('/');
        expect(instance).toBeDefined();
        expect(instance.$app).toEqual(app);
        expect(instance.$err).toEqual(app.$err);
        expect(instance.$log).toBeDefined();
        expect(instance.$log).toHaveProperty('trace');
        expect(instance.$log).toHaveProperty('verbose');
        expect(instance.$log).toHaveProperty('debug');
        expect(instance.$log).toHaveProperty('info');
        expect(instance.$log).toHaveProperty('warn');
        expect(instance.$log).toHaveProperty('error');
        expect(instance.$log).toHaveProperty('critical');
        expect(instance.$kvstore).toEqual(app.$kvstore);
        expect(instance.$params).toBeDefined();
        expect(instance.$params).toHaveProperty('get');
        expect(instance.$db).toHaveProperty('scoped');
      });

      it('should facilitate the creation of GET routes via @mapping', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.GET, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.status = 200;
            ctx.body = {id: 3};
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({id: 3});
      });

      it('should facilitate the creation of GET routes via @mapping with different status codes', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.GET, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.status = 201;
            ctx.body = {id: 3};
          }
        }

        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test');
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({id: 3});
      });

      it('should facilitate the creation of POST routes via @mapping', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.POST, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.body = {id: 1};
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).post('/api/test');
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({id: 1});
      });

      it('should facilitate the creation of PUT routes via @mapping', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.PUT, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.body = {id: 1};
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).put('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({id: 1});
      });

      it('should facilitate the creation of PATCH routes via @mapping', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.PATCH, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.body = {id: 1};
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).patch('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({id: 1});
      });

      it('should facilitate the creation of DELETE routes via @mapping', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Routes('/api')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.DELETE, '/test')
          @Ravel.Routes.before('middleware1', 'middleware2')
          async pathHandler (ctx) {
            ctx.body = {id: 1};
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).delete('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({id: 1});
      });

      it('should support the use of @before at the method and class levels', async () => {
        const middleware1 = async function (ctx, next) { ctx.body = {id: ctx.params.id}; await next(); };
        const middleware2 = async function (ctx, next) { ctx.body.name = 'sean'; await next(); };

        @Ravel.Routes('/api')
        @Ravel.Routes.before('middleware1')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Routes.mapping(Ravel.Routes.GET, '/test/:id')
          @Ravel.Routes.before('middleware2')
          async pathHandler (ctx) {
            ctx.status = 200;
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({id: '3', name: 'sean'});
      });

      it('should support the use of @mapping without @before', async () => {
        @Ravel.Routes('/api')
        class Test {
          @Ravel.Routes.mapping(Ravel.Routes.GET, '/test')
          async pathHandler (ctx) {
            ctx.status = 200;
            ctx.body = {};
          }

          @Ravel.Routes.before('middleware2') // this should just be ignored, since @mapping isn't present
          async ignoredHandler (ctx) {
            ctx.status = 200;
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({});
      });

      it('should support the use of @mapping at the class level as well, to denote unsupported routes', async () => {
        @Ravel.Routes('/api')
        @Ravel.Routes.mapping(Ravel.Routes.GET, '/path') // should respond with NOT_IMPLEMENTED
        @Ravel.Routes.mapping(Ravel.Routes.POST, '/another', 404) // should respond with 404
        class Test {
        }

        app.load(Test);
        await app.init();

        let response = await request(app.callback).get('/api/path');
        expect(response.statusCode).toBe(501);
        response = await request(app.callback).post('/api/another');
        expect(response.statusCode).toBe(404);
      });
    });

    it('should support non-async handlers as well', async () => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };

      @Ravel.Routes('/api')
      class Test {
        constructor () {
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @Ravel.Routes.mapping(Ravel.Routes.GET, '/test')
        @Ravel.Routes.before('middleware1', 'middleware2')
        pathHandler (ctx) {
          ctx.status = 200;
          ctx.body = {id: 3};
        }
      }
      app.load(Test);
      await app.init();

      const response = await request(app.callback).get('/api/test');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({id: 3});
    });

    it('should throw a Ravel.$err.IllegalValueError error when clients attempt to use a middleware factory with fewer than the required number of arguments', async () => {
      @Ravel.Module('/')
      class TestModule {
        @Ravel.Module.middleware('middleware1', true)
        middlewareFactory (one, two) {
          return async function () {};
        }
      }
      @Ravel.Routes('/')
      class TestRoutes {
        @Ravel.Routes.mapping(Ravel.Routes.GET, '/test')
        @Ravel.Routes.before('middleware1', 'arg1')
        pathHandler (ctx) {
          ctx.status = 200;
        }
      }
      app.load(TestModule, TestRoutes);
      await expect(app.init()).rejects.toThrow(app.$err.IllegalValueError);
    });
  });
});
