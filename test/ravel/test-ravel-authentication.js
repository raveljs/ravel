'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
chai.use(require('chai-as-promised'));
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const upath = require('upath');
const request = require('supertest');

let Ravel, ravelApp, agent;

const profile = {
  id: 1234,
  name: 'Sean McIntyre',
  password: 'abcd'
};

describe('Authentication Integration Test', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    // mock ravelApp.kvstore, since we're not actually starting ravelApp.
    mockery.registerMock('redis', require('redis-mock'));
    Ravel = require('../../lib/ravel');
    ravelApp = new Ravel();
    ravelApp.set('log level', ravelApp.log.NONE);
    ravelApp.log.setLevel('NONE');
    ravelApp.set('redis host', 'localhost');
    ravelApp.set('redis port', 5432);
    ravelApp.set('port', '9080');
    ravelApp.set('koa public directory', 'public');
    ravelApp.set('keygrip keys', ['mysecret']);
    done();
  });

  afterEach((done) => {
    ravelApp = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('Simulated Local Auth Provider', () => {
    beforeEach(async () => {
      const LocalStrategy = require('passport-local').Strategy;
      const bodyParser = require('koa-bodyparser');

      // test provider wrapping LocalStrategy
      class LocalProvider extends Ravel.AuthenticationProvider {
        get name () {
          return 'local';
        }

        init (koaRouter, passport, verify) {
          passport.use(new LocalStrategy(verify));

          // login route. Expects credentials in JSON.
          koaRouter.post('/auth/local', bodyParser(), function (ctx, next) {
            return passport.authenticate('local', function (err, user, info, status) {
              if (err || !user) {
                ctx.status = err && err.status ? err.status : 401;
                ctx.message = err && err.message ? err.message : '';
              } else {
                ctx.body = user;
                ctx.status = 200;
                return ctx.login(user);
              }
            })(ctx, next);
          });

          // verify session route
          koaRouter.get('/auth/local', function (ctx) {
            if (ctx.isAuthenticated()) {
              ctx.body = ctx.state.user;
              ctx.status = 200;
            } else {
              ctx.status = 401;
            }
          });
        }

        handlesClient (client) {
          return client === 'local';
        }

        credentialToProfile (session, client) {
          return new Promise((resolve, reject) => {
            if (client === 'local') {
              reject(new Ravel.ApplicationError.NotImplemented(
                'TODO: Implement credentialToProfile in LocalProvider for mobile client support.'));
            } else {
              reject(new Ravel.ApplicationError.IllegalValue(`LocalProvider does not handle clients of type ${client}`));
            }
          });
        }
      }

      @Ravel.Module.authconfig
      class AuthConfig extends Ravel.Module {
        serializeUser (profile) {
          return Promise.resolve(profile.id);
        }
        deserializeUser (userId) {
          if (userId === profile.id) {
            return Promise.resolve(profile);
          } else {
            return Promise.reject(new this.ApplicationError.Authentication('User session cannot be found.'));
          }
        }
        verify (provider, username, password) {
          if (username === profile.name && password === profile.password) {
            return Promise.resolve(profile);
          } else {
            return Promise.reject(new this.ApplicationError.Authentication('Username or password is incorrect'));
          }
        }
      }

      // stub Routes (miscellaneous routes, such as templated HTML content)
      const mapping = Ravel.Routes.mapping;
      const authenticated = Ravel.Routes.authenticated;

      @mapping(Ravel.Routes.DELETE, '/app', Ravel.httpCodes.NOT_IMPLEMENTED)
      class TestRoutes extends Ravel.Routes {
        constructor () {
          super('/');
        }

        @authenticated
        @mapping(Ravel.Routes.GET, '/app')
        async appHandler (ctx) {
          ctx.body = '<!DOCTYPE html><html></html>';
          ctx.status = 200;
        }

        @authenticated
        @mapping(Ravel.Routes.GET, '/deprecated')
        async deprecatedHandler (ctx) {
          ctx.body = ctx.passport.user;
          ctx.status = 200;
        }
      }

      new LocalProvider(ravelApp); // eslint-disable-line no-new
      mockery.registerMock(upath.join(ravelApp.cwd, 'authconfig'), AuthConfig);
      ravelApp.module('authconfig', 'authconfig');
      mockery.registerMock(upath.join(ravelApp.cwd, 'routes'), TestRoutes);
      ravelApp.routes('routes');
      await ravelApp.init();
      agent = request.agent(ravelApp.server); //eslint-disable-line
    });

    afterEach(() => {
      return ravelApp.close();
    });

    it('should support local auth on login route', (done) => {
      agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password })
        .expect(200)
        .end(done);
    });

    it('should reject incorrect passwords on login route', (done) => {
      agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: 'wrongpassword' })
        .expect(401)
        .end(done);
    });

    it('should reject unknown users on login route', (done) => {
      agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: 'wrongname', password: 'wrongpassword' })
        .expect(401)
        .end(done);
    });

    it('should reject users on an @authenticated route', (done) => {
      agent
        .get('/app')
        .expect(401)
        .end(done);
    });

    it('should allow access to authenticated users on @authenticated routes', (done) => {
      agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password })
        .end((err) => {
          if (err) done(err);
          agent.get('/app')
            .expect(200, '<!DOCTYPE html><html></html>')
            .end(done);
        });
    });

    it('should log a deprecation message for use of ctx.passport', (done) => {
      const spy = sinon.spy(ravelApp.log, 'warn');
      agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password })
        .end((err) => {
          if (err) done(err);
          agent.get('/deprecated')
            .expect(200)
            .end((err) => {
              try {
                expect(spy).to.have.been.calledWith('ctx.passport is deprecated. Please use ctx.state instead.');
                done(err);
              } catch (err2) {
                done(err2);
              }
            });
        });
    });
  });
});
