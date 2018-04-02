'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const request = require('supertest');
const upath = require('upath');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

let app, agent;

describe('Ravel end-to-end middleware test', () => {
  before((done) => {
    process.removeAllListeners('unhandledRejection');
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    done();
  });

  after((done) => {
    process.removeAllListeners('unhandledRejection');
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('basic application server consisting of routes', () => {
    before(async () => {
      const Ravel = require('../../lib/ravel');
      // stub Routes (miscellaneous routes, such as templated HTML content)
      const middleware = Ravel.Module.middleware;
      const pre = Ravel.Routes.before;
      const mapping = Ravel.Routes.mapping;

      class TestModule extends Ravel.Module {
        @middleware('some-middleware')
        async someMiddleware(ctx, next) {
          ctx.body = 'Hello';
          await next();
        }
      }

      class TestRoutes extends Ravel.Routes {
        constructor () {
          super('/api/routes');
        }

        @pre('some-middleware')
        @mapping(Ravel.Routes.GET, '/')
        getHandler (ctx) {
          ctx.body += ' World!';
        }
      }

      app = new Ravel();
      app.set('log level', app.log.NONE);
      app.set('port', '9080');
      app.set('koa public directory', 'public');
      app.set('keygrip keys', ['mysecret']);

      mockery.registerMock(upath.join(app.cwd, 'module'), TestModule);
      app.module('module', 'module');
      mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
      app.routes('routes');
      await app.init();

      agent = request.agent(app.server);
    });

    after(async () => {
      app = undefined;
    });

    it('@middleware should make a module method available as middleware for use with @before', (done) => {
      agent
        .get('/api/routes')
        .expect(200, 'Hello World!')
        .end(done);
    });
  });
});
