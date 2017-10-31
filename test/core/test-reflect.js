'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
chai.use(require('sinon-chai'));
const upath = require('upath');

let Ravel, app;

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.log.setLevel(app.log.NONE);
    app.kvstore = {}; // mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    app = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#reflect()', () => {
    it('should allow clients to retrieve metadata from Modules', (done) => {
      const inject = Ravel.inject;
      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Ravel.Module {
        constructor (a) {
          super();
          expect(a).to.equal(another);
        }

        method () {}
      }
      mockery.registerMock(upath.join(app.cwd, 'test'), Stub);
      app.module('./test', 'test');

      expect(app.reflect('./test').registeredAt).to.be.a('number');
      const meta = app.reflect('./test').metadata;
      expect(meta).to.deep.equal({
        class: {
          'ravel': { 'instance': app },
          '@inject': { dependencies: ['another'] },
          source: { 'name': 'test', path: './test' }
        },
        method: {}
      });
      done();
    });

    it('should allow clients to retrieve metadata from Routes', (done) => {
      const Routes = Ravel.Routes;
      const before = Routes.before;
      const mapping = Routes.mapping;

      @before('middleware1')
      @mapping(Routes.GET, '/path', 404)
      class Stub extends Routes {
        constructor () {
          super('/app');
        }

        @mapping(Routes.PUT, '/path')
        @before('middleware2')
        async pathHandler (ctx) {
          ctx.status = 200;
        }
      }
      mockery.registerMock(upath.join(app.cwd, './stub'), Stub);
      app.routes('./stub');
      const meta = app.reflect('./stub').metadata;
      expect(meta).to.deep.equal({
        class: {
          'ravel': { 'instance': app },
          '@before': { middleware: ['middleware1'] },
          '@mapping': {
            'Symbol(get) /path': {
              path: '/path',
              verb: Routes.GET,
              status: 404,
              suppressLog: undefined
            }
          },
          source: { path: './stub' }
        },
        method: {
          pathHandler: {
            '@before': { middleware: ['middleware2'] },
            '@mapping': {
              info: {
                endpoint: Stub.prototype.pathHandler,
                path: '/path',
                verb: Routes.PUT,
                suppressLog: undefined
              }
            }
          }
        }
      });
      done();
    });

    it('should allow clients to retrieve metadata from Resources', async () => {
      const middleware1 = async function (ctx, next) { await next(); };
      const middleware2 = async function (ctx, next) { await next(); };
      const Resource = Ravel.Resource;
      const before = Resource.before;

      @before('middleware1')
      class Stub extends Resource {
        constructor () {
          super('/app');
        }

        @before('middleware2')
        async get (ctx) {
          ctx.status = 200;
        }
      }
      mockery.registerMock(upath.join(app.cwd, './stub'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      app.db = { // mock app.db
        middleware: async function (ctx, next) { await next(); }
      };

      // need to call init so that it creates @mapping decorators
      mockery.registerMock('redis', require('redis-mock'));
      app.set('log level', app.log.NONE);
      app.set('redis host', 'localhost');
      app.set('redis port', 5432);
      app.set('port', '9080');
      app.set('koa public directory', 'public');
      app.set('keygrip keys', ['mysecret']);
      app.resource('./stub');
      await app.init();

      const meta = app.reflect('./stub').metadata;

      expect(meta).to.deep.equal({
        class: {
          'ravel': { 'instance': app },
          '@before': { middleware: ['middleware1'] },
          '@mapping': {
            'Symbol(get) /': { verb: Resource.GET, path: '/', status: 501, suppressLog: true },
            'Symbol(put) /': { verb: Resource.PUT, path: '/', status: 501, suppressLog: true },
            'Symbol(delete) /': { verb: Resource.DELETE, path: '/', status: 501, suppressLog: true },
            'Symbol(post) /': { verb: Resource.POST, path: '/', status: 501, suppressLog: true },
            'Symbol(put) /:id': { verb: Resource.PUT, path: '/:id', status: 501, suppressLog: true },
            'Symbol(delete) /:id': { verb: Resource.DELETE, path: '/:id', status: 501, suppressLog: true }
          },
          source: { path: './stub' }
        },
        method: {
          get: {
            '@before': { middleware: ['middleware2'] },
            '@mapping': {
              info: {
                endpoint: meta.method.get['@mapping'].info.endpoint,
                path: '/:id',
                verb: Resource.GET,
                suppressLog: undefined
              }
            }
          }
        }
      });
    });

    it('should throw an ApplicationError.NotFound if the specified path is not a known Ravel component', (done) => {
      function test () {
        app.reflect('./stub');
      }
      expect(test).to.throw(app.ApplicationError.NotFound);
      done();
    });
  });

  describe('#knownClasses()', () => {
    it('should respond with an Array<String> of known class file paths', (done) => {
      const inject = Ravel.inject;
      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Ravel.Module {
        constructor (a) {
          super();
          expect(a).to.equal(another);
        }

        method () {}
      }
      mockery.registerMock(upath.join(app.cwd, 'test'), Stub);
      app.module('./test', 'test');

      const Routes = Ravel.Routes;
      const before = Routes.before;
      const mapping = Routes.mapping;
      @before('middleware1')
      @mapping(Routes.GET, '/path', 404)
      class Stub2 extends Routes {
        constructor () {
          super('/app');
        }

        @mapping(Routes.PUT, '/path')
        @before('middleware2')
        async pathHandler (ctx) {
          ctx.status = 200;
        }
      }
      mockery.registerMock(upath.join(app.cwd, './stub'), Stub2);
      app.routes('./stub');

      const knownClasses = app.knownClasses();
      expect(knownClasses).to.deep.equal(['./test', './stub']);
      done();
    });
  });
});
