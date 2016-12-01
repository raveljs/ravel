'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const request = require('supertest');
const async = require('async');
const Koa = require('koa');

let Ravel, Routes, inject, mapping, before, coreSymbols;

describe('Ravel', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Routes = require('../../lib/ravel').Routes;
    inject = require('../../lib/ravel').inject;
    before = Routes.before;
    mapping = Routes.mapping;
    coreSymbols = require('../../lib/core/symbols');
    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    inject = undefined;
    Routes = undefined;
    mapping = undefined;
    before = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#routes()', function() {
    it('should permit clients to register route modules for instantiation in Ravel.start', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './routes/index_r'), class extends Routes {constructor() {super('/');}});
      Ravel.routes('./routes/index_r');
      expect(Ravel[coreSymbols.routesFactories]).to.have.property('./routes/index_r');
      expect(Ravel[coreSymbols.routesFactories]['./routes/index_r']).to.be.a('function');
      done();
    });

    it('should permit clients to register route modules using absolute paths', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './routes/index_r'), class extends Routes {constructor() {super('/');}});
      Ravel.routes(upath.join(Ravel.cwd, './routes/index_r'));
      expect(Ravel[coreSymbols.routesFactories]).to.have.property(upath.join(Ravel.cwd, './routes/index_r'));
      expect(Ravel[coreSymbols.routesFactories][upath.join(Ravel.cwd, './routes/index_r')]).to.be.a('function');
      done();
    });

    it('should throw Ravel.ApplicationError.IllegalValue when Resource constructor super() is called without a basePath', (done) => {
      const stub = class extends Routes {
        constructor() {
          super();
        }
      };
      const router = require('koa-router')();
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.routes('test');
      const test = function() {
        Ravel[coreSymbols.routesInit](router);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw ApplicationError.DuplicateEntry when a client attempts to register the same route module twice', (done) => {
      try {
        mockery.registerMock(upath.join(Ravel.cwd, './routes/index_r'), class extends Routes {});
        Ravel.routes('./routes/index_r');
        Ravel.routes('./routes/index_r');
        done(new Error('Registering the same route module twice should be impossible'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple routes modules with the same base path', (done) => {
      const stub1 = class extends Routes {
        constructor() {
          super('/api/test');
        }
      };
      const stub2 = class extends Routes {
        constructor() {
          super('/api/test');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test1'), stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), stub2);
      Ravel.routes('test1');
      Ravel.routes('test2');
      const router = require('koa-router')();
      const shouldFail = function() {
        Ravel[coreSymbols.routesInit](router);
      };
      expect(shouldFail).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a factory function which can be used to instantiate the specified routes module and perform dependency injection', (done) => {
      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Routes {
        constructor(a) {
          super('/');
          expect(a).to.equal(another);
          expect(this).to.have.property('basePath').that.equals('/');
          expect(this.log).to.be.ok;
          expect(this.log).to.be.an('object');
          expect(this.log).to.have.property('trace').that.is.a('function');
          expect(this.log).to.have.property('verbose').that.is.a('function');
          expect(this.log).to.have.property('debug').that.is.a('function');
          expect(this.log).to.have.property('info').that.is.a('function');
          expect(this.log).to.have.property('warn').that.is.a('function');
          expect(this.log).to.have.property('error').that.is.a('function');
          expect(this.log).to.have.property('critical').that.is.a('function');
          expect(this.ApplicationError).to.equal(Ravel.ApplicationError);
          expect(this.kvstore).to.equal(Ravel.kvstore);
          expect(this.params).to.be.an.object;
          expect(this.params).to.have.a.property('get').that.is.a.function;
          done();
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'stub'), Stub);
      Ravel.routes('stub');
      const router = require('koa-router')();
      Ravel[coreSymbols.routesInit](router);
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a routes module which is not a subclass of Routes', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = function() {
        Ravel.routes('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via @mapping', (done) => {
      const middleware1 = async function(ctx, next) { await next(); };
      const middleware2 = async function(ctx, next) { await next(); };

      class Stub extends Routes {
        constructor() {
          super('/api');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @mapping(Routes.GET, '/test')
        @before('middleware1','middleware2')
        async pathHandler(ctx) {
          ctx.status = 200;
          ctx.body = {id: 3};
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .get('/api/test')
      .expect(200, {id: 3}, done);
    });

    it('should facilitate the creation of POST routes via @mapping', (done) => {
      const middleware1 = async function(ctx, next) { await next(); };
      const middleware2 = async function(ctx, next) { await next(); };
      const body = {id: 1};

      class Stub extends Routes {
        constructor() {
          super('/api');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @mapping(Routes.POST, '/test')
        @before('middleware1','middleware2')
        async pathHandler(ctx) {
          ctx.status = 200;
          ctx.body = body;
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .post('/api/test')
      .expect(201, body, done);
    });

    it('should facilitate the creation of PUT routes via @mapping', (done) => {
      const middleware1 = async function(ctx, next) { await next(); };
      const middleware2 = async function(ctx, next) { await next(); };

      class Stub extends Routes {
        constructor() {
          super('/api');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @mapping(Routes.PUT, '/test')
        @before('middleware1','middleware2')
        async pathHandler(ctx) {
          ctx.body = {id: 1};
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .put('/api/test')
      .expect(200, {id: 1}, done);
    });

    it('should facilitate the creation of DELETE routes via @mapping', (done) => {
      const middleware1 = async function(ctx, next) { await next(); };
      const middleware2 = async function(ctx, next) { await next(); };

      class Stub extends Routes {
        constructor() {
          super('/api');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @mapping(Routes.DELETE, '/test')
        @before('middleware1','middleware2')
        async pathHandler(ctx) {
          ctx.body = {id: 1};
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .delete('/api/test')
      .expect(200, {id: 1}, done);
    });

    it('should support the use of @before at the method and class levels', (done) => {
      const middleware1 = async function(ctx, next) { ctx.body = {id: ctx.params.id}; await next(); };
      const middleware2 = async function(ctx, next) { ctx.body.name = 'sean'; await next(); };

      @before('middleware1')
      class Stub extends Routes {
        constructor() {
          super('/api');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @mapping(Routes.GET, '/test/:id')
        @before('middleware2')
        async pathHandler(ctx) {
          ctx.status = 200;
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .get('/api/test/3')
      .expect(200, {id: 3, name: 'sean'}, done);
    });

    it('should support the use of @mapping without @before', (done) => {
      class Stub extends Routes {
        constructor() {
          super('/api');
        }

        @mapping(Routes.GET, '/test')
        async pathHandler(ctx) {
          ctx.status = 200;
          ctx.body = {};
        }

        @before('middleware2') // this should just be ignored, since @mapping isn't present
        async ignoredHandler(ctx) {
          ctx.status = 200;
        }
      };
      const router = new (require('koa-router'))();
      const app = new Koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.routes('test');
      Ravel[coreSymbols.routesInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .get('/api/test')
      .expect(200, {}, done);
    });

    it('should support the use of @mapping at the class level as well, to denote unsupported routes', (done) => {
      @mapping(Routes.GET, '/path') // should respond with NOT_IMPLEMENTED
      @mapping(Routes.POST, '/another', 404) // should respond with 404
      class Stub extends Routes {
        constructor() {
          super('/app');
        }
      };
      mockery.registerMock('redis', require('redis-mock'));
      mockery.registerMock(upath.join(Ravel.cwd, 'stub'), Stub);
      Ravel.set('log level', Ravel.log.NONE);
      Ravel.set('redis host', 'localhost');
      Ravel.set('redis port', 5432);
      Ravel.set('port', '9080');
      Ravel.set('koa public directory', 'public');
      Ravel.set('keygrip keys', ['mysecret']);
      Ravel.routes('stub');
      Ravel.init();
      const agent = request.agent(Ravel.server);
      async.series([
        function(next) {agent.get('/app/path').expect(501).end(next);},
        function(next) {agent.post('/app/another').expect(404).end(next);}
      ], done);
    });
  });

  it('should support non-async handlers as well', (done) => {
    const middleware1 = async function(ctx, next) { await next(); };
    const middleware2 = async function(ctx, next) { await next(); };

    class Stub extends Routes {
      constructor() {
        super('/api');
        this.middleware1 = middleware1;
        this.middleware2 = middleware2;
      }

      @mapping(Routes.GET, '/test')
      @before('middleware1','middleware2')
      pathHandler(ctx) {
        ctx.status = 200;
        ctx.body = {id: 3};
      }
    };
    const router = new (require('koa-router'))();
    const app = new Koa();

    mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
    Ravel.routes('test');
    Ravel[coreSymbols.routesInit](router);

    app.use(router.routes());
    app.use(router.allowedMethods());

    request(app.callback())
    .get('/api/test')
    .expect(200, {id: 3}, done);
  });
});
