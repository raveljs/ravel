describe('Authentication Integration Test', () => {
  let Ravel, app;
  const profile = {
    id: 1234,
    name: 'Sean McIntyre',
    password: 'abcd'
  };

  beforeEach(async () => {
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('log level', app.$log.NONE);
    app.set('keygrip keys', ['mysecret']);
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
          return client === 'local' || client === 'token';
        }

        credentialToProfile (session, client) {
          return new Promise((resolve, reject) => {
            if (client === 'token') {
              if (session === '123456789') {
                return resolve({expiry: 60, profile: profile});
              } else {
                return reject(new Ravel.$err.Authentication('Incorrect API token'));
              }
            } else {
              return reject(new Ravel.$err.IllegalValue(`LocalProvider does not support token auth for clients of type ${client}`));
            }
          });
        }
      }

      @Ravel.Module.authconfig
      @Ravel.Module('authconfig')
      @Ravel.inject('$err')
      class AuthConfig {
        constructor ($err) {
          this.$err = $err;
        }
        serializeUser (profile) {
          return Promise.resolve(profile.id);
        }
        deserializeUser (userId) {
          if (userId === profile.id) {
            return Promise.resolve(profile);
          } else {
            return Promise.reject(new this.$err.Authentication('User session cannot be found.'));
          }
        }
        verify (provider, username, password) {
          if (username === profile.name && password === profile.password) {
            return Promise.resolve(profile);
          } else {
            return Promise.reject(new this.$err.Authentication('Username or password is incorrect'));
          }
        }
      }

      // stub Routes (miscellaneous routes, such as templated HTML content)
      const mapping = Ravel.Routes.mapping;
      const authenticated = Ravel.Routes.authenticated;

      @Ravel.Routes('/')
      @mapping(Ravel.Routes.DELETE, '/app', Ravel.httpCodes.NOT_IMPLEMENTED)
      class TestRoutes {
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

        @authenticated({redirect: true})
        @mapping(Ravel.Routes.GET, '/redirect')
        async redirectHandlerl (ctx) {
          ctx.body = 'hello';
        }
      }

      new LocalProvider(app); // eslint-disable-line no-new
      app.load(AuthConfig, TestRoutes);
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should support local auth on login route', async () => {
      await request(app.callback)
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password })
        .expect(200);
    });

    it('should reject incorrect passwords on login route', async () => {
      await request(app.callback)
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject unknown users on login route', async () => {
      await request(app.callback)
        .post('/auth/local')
        .type('application/json')
        .send({ username: 'wrongname', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject unauthenticated users on an @authenticated route', async () => {
      await request(app.callback)
        .get('/app')
        .expect(401);
    });

    it('should redirect unauthenticated users on an @authenticated route with redirect:true', async () => {
      await request(app.callback)
        .get('/redirect')
        .expect(302)
        .expect('Location', app.get('login route'));
    });

    it('should reject tokenauth users on an @authenticated route when they have the wrong token', async () => {
      await request(app.callback)
        .get('/app')
        .set('x-auth-token', 'bad-token')
        .set('x-auth-client', 'token')
        .expect(401);
    });

    it('should reject tokenauth users on an @authenticated route when their client type is not supported', async () => {
      await request(app.callback)
        .get('/app')
        .set('x-auth-token', '123456789')
        .set('x-auth-client', 'bad-type')
        .expect(401);
    });

    it('should allow access to authenticated users on @authenticated routes', async () => {
      // TODO remove workaround.
      // cookies are busted in jest due to bugs:
      // https://github.com/visionmedia/supertest/issues/336
      // https://github.com/facebook/jest/issues/3547
      // https://github.com/visionmedia/supertest/issues/460
      // https://github.com/facebook/jest/issues/2549
      const agent = request.agent(app.server);
      const res = await agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password })
        .expect(200);
      const cookies = res.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]).join(';');
      await agent
        .get('/app')
        .set('Cookie', cookies)
        .expect(200, '<!DOCTYPE html><html></html>');
    });

    it('should allow access to token-authenticated users on @authenticated routes', async () => {
      const agent = request.agent(app.server);
      await agent
        .get('/app')
        .set('x-auth-token', '123456789')
        .set('x-auth-client', 'token')
        .expect(200, '<!DOCTYPE html><html></html>');
    });

    it('should log a deprecation message for use of ctx.passport', async () => {
      // TODO remove workaround.
      // cookies are busted in jest due to bugs:
      // https://github.com/visionmedia/supertest/issues/336
      // https://github.com/facebook/jest/issues/3547
      // https://github.com/visionmedia/supertest/issues/460
      // https://github.com/facebook/jest/issues/2549
      const spy = jest.spyOn(app.$log, 'warn');
      const agent = request.agent(app.server);
      const res = await agent
        .post('/auth/local')
        .type('application/json')
        .send({ username: profile.name, password: profile.password });
      const cookies = res.headers['set-cookie'][0].split(',').map(item => item.split(';')[0]).join(';');
      await agent
        .get('/deprecated')
        .set('Cookie', cookies)
        .expect(200);
      expect(spy).toHaveBeenCalledWith('ctx.passport is deprecated. Please use ctx.state instead.');
    });
  });
});
