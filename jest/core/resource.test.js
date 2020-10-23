
describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });
  describe('#resource', () => {
    it('should throw an exception if called before app.init()', () => {
      @Ravel.Resource('/')
      class Test {}
      app.load(Test);
      expect(() => app.resource('/')).toThrow(app.$err.General);
    });
  });

  // Testing how Ravel loads resources
  describe('#load', () => {
    describe('@Resource', () => {
      it('should register resource modules for instantiation and initialization in Ravel.init', async () => {
        const spy = jest.fn();
        @Ravel.Resource('/')
        class Test {
          method () {
            spy();
          }
        }
        app.load(Test);
        await app.init();
        expect(app.resource('/')).toBeDefined();
        app.resource('/').method();
        expect(spy).toHaveBeenCalled();
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a resource module without a basePath', async () => {
        expect(() => {
          @Ravel.Resource
          class Test {}
          app.load(Test);
        }).toThrowError(app.$err.IllegalValue);
      });

      it('should throw an $err.NotImplemented when a client attempts to access @mapping on a Resource', () => {
        const shouldThrow = () => {
          @Ravel.Resource('/')
          @Ravel.Resource.mapping()
          class Test {}
          app.load(Test);
        };
        expect(shouldThrow).toThrowError(app.$err.NotImplemented);
      });

      it('should throw a Ravel.$err.DuplicateEntry error when clients attempt to register multiple resource modules with the same basePath', () => {
        @Ravel.Resource('/')
        class Test {}
        @Ravel.Resource('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.$err.DuplicateEntry);
      });

      it('should throw a Ravel.$err.DuplicateEntry error when clients attempt to register multiple resource and routes modules with the same basePath', () => {
        @Ravel.Resource('/')
        class Test {}
        @Ravel.Routes('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.$err.DuplicateEntry);
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a resource module without appropriate decoration', async () => {
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.$err.IllegalValue);
      });

      it('should load and instantiate resource modules, performing dependency injection of core services', async () => {
        @Ravel.Resource('/')
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
        const instance = app.resource('/');
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

      it('should facilitate the creation of GET routes getAll()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async getAll (ctx) {
            ctx.status = 200;
            ctx.body = { id: 3 };
          }
        }

        app.load(Test);
        await app.init();
        const response = await request(app.callback).get('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: 3 });
      });

      it('should facilitate the creation of GET routes get()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async get (ctx) {
            ctx.status = 200;
            ctx.body = { id: ctx.params.id };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '3' });
      });

      it('should facilitate the creation of HEAD routes headAll()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async headAll (ctx) {
            ctx.status = 200;
          }
        }

        app.load(Test);
        await app.init();
        const response = await request(app.callback).head('/api/test');
        expect(response.statusCode).toBe(200);
      });

      it('should facilitate the creation of HEAD routes head()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async head (ctx) {
            ctx.status = 200;
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).head('/api/test/3');
        expect(response.statusCode).toBe(200);
      });

      it('should facilitate the creation of POST routes via post()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async post (ctx) {
            ctx.body = { id: 1 };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).post('/api/test');
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({ id: 1 });
      });

      it('should facilitate the creation of PUT routes via putAll()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async putAll (ctx) {
            ctx.body = { id: 1 };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).put('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: 1 });
      });

      it('should facilitate the creation of PUT routes via put()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async put (ctx) {
            ctx.body = { id: ctx.params.id };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).put('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '3' });
      });

      it('should facilitate the creation of PATCH routes via patchAll()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async patchAll (ctx) {
            ctx.body = { id: 1 };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).patch('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: 1 });
      });

      it('should facilitate the creation of PATCH routes via patch()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async patch (ctx) {
            ctx.body = { id: ctx.params.id };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).patch('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '3' });
      });

      it('should facilitate the creation of DELETE routes via deleteAll()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async deleteAll (ctx) {
            ctx.body = { id: 1 };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).delete('/api/test');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: 1 });
      });

      it('should facilitate the creation of DELETE routes via delete()', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async delete (ctx) {
            ctx.body = { id: 1 };
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).delete('/api/test/1');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: 1 });
      });

      it('should support the use of @before at the method and class levels', async () => {
        const middleware1 = async function (ctx, next) { ctx.body = { id: ctx.params.id }; await next(); };
        const middleware2 = async function (ctx, next) { ctx.body.name = 'sean'; await next(); };

        @Ravel.Resource('/api/test')
        @Ravel.Resource.before('middleware1')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware2')
          async get (ctx) {
            ctx.status = 200;
          }
        }
        app.load(Test);
        await app.init();

        const response = await request(app.callback).get('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '3', name: 'sean' });
      });

      it('should support the use of @before on some, but not all, endpoints', async () => {
        const middleware1 = async function (ctx, next) { ctx.body = { id: ctx.params.id }; await next(); };
        const middleware2 = async function (ctx, next) { ctx.body.name = 'sean'; await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async get () {
          }

          async put (ctx) {
            ctx.body = '';
          }
        }
        app.load(Test);
        await app.init();

        let response = await request(app.callback).get('/api/test/3');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({ id: '3', name: 'sean' });
        response = await request(app.callback).put('/api/test/1');
        expect(response.statusCode).toBe(204);
      });

      it('should implement stub endpoints for unused HTTP verbs, all of which return a status httpCodes.NOT_IMPLEMENTED', async () => {
        @Ravel.Resource('/api/test')
        class Test { }
        app.load(Test);
        await app.init();

        expect((await request(app.callback).get('/api/test')).statusCode).toBe(501);
        expect((await request(app.callback).get('/api/test/1')).statusCode).toBe(501);
        expect((await request(app.callback).post('/api/test')).statusCode).toBe(501);
        expect((await request(app.callback).put('/api/test')).statusCode).toBe(501);
        expect((await request(app.callback).put('/api/test/2')).statusCode).toBe(501);
        expect((await request(app.callback).delete('/api/test')).statusCode).toBe(501);
        expect((await request(app.callback).delete('/api/test/50')).statusCode).toBe(501);
      });

      it('should facilitate the creation of routes which are not decorated with middleware', async () => {
        @Ravel.Resource('/api/test')
        class Test {
          async getAll (ctx) {
            ctx.body = '';
          }
        }
        app.load(Test);
        await app.init();

        expect((await request(app.callback).get('/api/test')).statusCode).toBe(204);
      });

      it('should throw Ravel.$err.General if ctx.response.body is used in a HEAD route', async () => {
        const middleware1 = async function (ctx, next) { await next(); };
        const middleware2 = async function (ctx, next) { await next(); };

        @Ravel.Resource('/api/test')
        class Test {
          constructor () {
            this.middleware1 = middleware1;
            this.middleware2 = middleware2;
          }

          @Ravel.Resource.before('middleware1', 'middleware2')
          async headAll (ctx) {
            ctx.status = 200;
            ctx.body = { id: 3 };
          }
        }

        app.load(Test);
        await app.init();
        const response = await request(app.callback).head('/api/test');
        expect(response.statusCode).toBe(500);
      });
    });
  });
});
