describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
  });
  // Testing how Ravel loads modules
  describe('load', () => {
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

      it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a routes module without a basePath', async () => {
        expect(() => {
          @Ravel.Routes
          class Test {}
          app.load(Test);
        }).toThrowError(app.ApplicationError.IllegalValue);
      });

      it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple routes modules with the same basePath', () => {
        @Ravel.Routes('/')
        class Test {}
        @Ravel.Routes('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.ApplicationError.DuplicateEntry);
      });

      it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a routes module without appropriate decoration', async () => {
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.ApplicationError.IllegalValue);
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
        expect(instance.$err).toEqual(app.ApplicationError);
        expect(instance.$log).toBeDefined();
        expect(instance.$log).toHaveProperty('trace');
        expect(instance.$log).toHaveProperty('verbose');
        expect(instance.$log).toHaveProperty('debug');
        expect(instance.$log).toHaveProperty('info');
        expect(instance.$log).toHaveProperty('warn');
        expect(instance.$log).toHaveProperty('error');
        expect(instance.$log).toHaveProperty('critical');
        expect(instance.$kvstore).toEqual(app.kvstore);
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
    });
  });
});
