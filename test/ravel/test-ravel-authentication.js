'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
// const expect = chai.expect;
chai.use(require('chai-things'));
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
    beforeEach((done) => {
      const LocalStrategy = require('passport-local').Strategy;
      const bodyParser = require('koa-better-body');
      const koaConvert = require('koa-convert');

      // test provider wrapping LocalStrategy
      class LocalProvider extends Ravel.AuthenticationProvider {
        get name () {
          return 'local';
        }

        init (koaRouter, passport, verify) {
          passport.use(new LocalStrategy(verify));

          // login route. Expects credentials in JSON.
          koaRouter.post('/auth/local', koaConvert(bodyParser()), function (ctx, next) {
            ctx.req.body = ctx.request.fields;
            ctx.request.body = ctx.req.body;
            return passport.authenticate('local', function (user, info) {
              if (user === false) {
                ctx.status = 401;
                // TODO should log info via ravel.
                ctx.message = JSON.stringify(info);
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
              ctx.body = ctx.req.user;
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
            return Promise.reject(new this.ApplicationError.Authentication());
          }
        }
        verify (provider, username, password) {
          if (username === profile.name && password === profile.password) {
            return Promise.resolve(profile);
          } else {
            return Promise.reject(new this.ApplicationError.Authentication());
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
      }

      new LocalProvider(ravelApp); // eslint-disable-line no-new
      mockery.registerMock(upath.join(ravelApp.cwd, 'authconfig'), AuthConfig);
      ravelApp.module('authconfig', 'authconfig');
      mockery.registerMock(upath.join(ravelApp.cwd, 'routes'), TestRoutes);
      ravelApp.routes('routes');
      ravelApp.init();
      agent = request.agent(ravelApp.server); //eslint-disable-line
      done();
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
  });
});
