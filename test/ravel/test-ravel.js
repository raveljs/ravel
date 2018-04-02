'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
const upath = require('upath');
const request = require('supertest');
// const sinon = require('sinon')
// chai.use(require('sinon-chai'))

let app, agent;

const u = [{id: 1, name: 'Joe'}, {id: 2, name: 'Jane'}];

describe('Ravel end-to-end test', () => {
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

  describe('#init()', () => {
    describe('uncaught ES6 Promise errors logging', () => {
      it('should log unhandled erors within Promises', async () => {
        const Ravel = require('../../lib/ravel');
        app = new Ravel();
        app.set('log level', app.log.NONE);
        app.set('keygrip keys', ['mysecret']);
        app.set('port', '9080');
        await app.init();
        for (let i = 0; i < 5; i++) {
          Promise.resolve('promised value').then(() => {
            throw new Error('error');
          });
          Promise.resolve('promised value').then(() => {
            throw undefined; // eslint-disable-line no-throw-literal
          });
        }
        // TODO actually test that logging occurred
      });
    });

    describe('basic application server consisting of a module and a resource', () => {
      before(async () => {
        const Ravel = require('../../lib/ravel');
        const httpCodes = require('../../lib/util/http_codes');
        const ApplicationError = require('../../lib/util/application_error');
        const inject = Ravel.inject;

        // stub Module (business logic container)
        const middleware = Ravel.Module.middleware;
        class Users extends Ravel.Module {
          getAllUsers () {
            return Promise.resolve(u);
          }

          getUser (userId) {
            if (userId < u.length) {
              return Promise.resolve(u[userId - 1]);
            } else {
              return Promise.reject(new this.ApplicationError.NotFound('User id=' + userId + ' does not exist!'));
            }
          }

          @middleware('some-middleware')
          async someMiddleware (ctx, next) { await next(); }
        }

        // stub Resource (REST interface)
        // have to alias to @pre instead of proper @before, since the latter clashes with mocha
        const pre = Ravel.Resource.before;
        @inject('users')
        class UsersResource extends Ravel.Resource {
          constructor (users) {
            super('/api/user');
            this.users = users;
          }

          @pre('some-middleware')
          async getAll (ctx) {
            const list = await this.users.getAllUsers();
            ctx.body = list;
          }

          @pre('some-middleware')
          get (ctx) {
            // return promise and don't catch possible error so that Ravel can catch it
            return this.users.getUser(ctx.params.id)
              .then((result) => {
                ctx.body = result;
              });
          }

          @pre('some-middleware')
          async post () {
            throw new this.ApplicationError.DuplicateEntry();
          }
        }

        // stub Routes (miscellaneous routes, such as templated HTML content)
        const mapping = Ravel.Routes.mapping;

        @mapping(Ravel.Routes.DELETE, '/app', Ravel.httpCodes.NOT_IMPLEMENTED)
        class TestRoutes extends Ravel.Routes {
          constructor () {
            super('/');
          }

          @mapping(Ravel.Routes.GET, '/app')
          async appHandler (ctx) {
            ctx.body = '<!DOCTYPE html><html></html>';
            ctx.status = 200;
          }

          @mapping(Ravel.Routes.GET, '/login')
          loginHandler (ctx) {
            return Promise.resolve().then(() => {
              ctx.body = '<!DOCTYPE html><html><head><title>login</title></head></html>';
              ctx.status = 200;
            });
          }
        }

        app = new Ravel();
        expect(Ravel).to.have.a.property('httpCodes').that.deep.equals(httpCodes);
        expect(Ravel).to.have.a.property('Error').that.deep.equals(ApplicationError.General);
        app.set('log level', app.log.NONE);
        app.set('port', '9080');
        app.set('koa public directory', 'public');
        app.set('keygrip keys', ['mysecret']);

        mockery.registerMock(upath.join(app.cwd, 'users'), Users);
        app.module('users', 'users');
        mockery.registerMock(upath.join(app.cwd, 'usersResource'), UsersResource);
        app.resource('usersResource');
        mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
        app.routes('routes');
        await app.init();

        agent = request.agent(app.server);
      });

      after((done) => {
        app = undefined;
        done();
      });

      it('should respond with the list of registered users', (done) => {
        agent
          .get('/api/user')
          .expect(200, JSON.stringify(u))
          .end(done);
      });

      it('should respond with a single existing user', (done) => {
        agent
          .get('/api/user/1')
          .expect(200, JSON.stringify(u[0]))
          .end(done);
      });

      it('should respond with HTTP 404 NOT FOUND for non-existent users', (done) => {
        agent
          .get('/api/user/3')
          .expect(404)
          .end(done);
      });

      it('should respond with CONFLICT 409 for POST users', (done) => {
        agent
          .post('/api/user')
          .expect(409)
          .end(done);
      });

      it('should respond with html on the route GET /app', (done) => {
        agent
          .get('/app')
          .expect(200, '<!DOCTYPE html><html></html>')
          .end(done);
      });

      it('should respond with NOT_IMPLEMENTED 501 on the route DELETE /app', (done) => {
        agent
          .delete('/app')
          .expect(501)
          .end(done);
      });

      it('should respond with html on the route /login', (done) => {
        agent
          .get('/login')
          .expect(200, '<!DOCTYPE html><html><head><title>login</title></head></html>')
          .end(done);
      });
    });
  });
});
