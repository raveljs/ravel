describe('Ravel end-to-end test', () => {
  let app;
  const u = [{id: 1, name: 'Joe'}, {id: 2, name: 'Jane'}];

  describe('#init()', () => {
    describe('uncaught ES6 Promise errors logging', () => {
      it('should log unhandled erors within Promises', async () => {
        const process = require('process');
        const Ravel = require('../../lib/ravel');
        app = new Ravel();
        app.set('log level', app.$log.ERROR);
        app.set('keygrip keys', ['mysecret']);
        await app.init();
        app.$log.error = jest.fn();
        for (let i = 0; i < 10; i++) {
          // fake it
          process.emit('unhandledRejection', new Error('error'));
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(app.$log.error).toHaveBeenCalled();
      });
    });

    describe('session option parameters', () => {
      let app;

      beforeEach(async () => {
        const Ravel = require('../../lib/ravel');
        const mapping = Ravel.Routes.mapping;
        @Ravel.Routes('/')
        class TestRoutes {
          @mapping(Ravel.Routes.GET, '/session-options')
          sessionOptionsHandler (ctx) {
            return Promise.resolve().then(() => {
              ctx.body = ctx.sessionOptions;
              ctx.status = 200;
            });
          }
        }
        app = new Ravel();
        app.load(TestRoutes);
      });

      it('should set session to insecure when session security set to false', async () => {
        app.set('session secure', false);
        await app.init();
        const res = await request(app.callback).get('/session-options');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.objectContaining({secure: false}));
      });

      it('should not set session to insecure when using https', async () => {
        app.set('session secure', false);
        app.set('https', true);
        await app.init();
        const res = await request(app.callback).get('/session-options');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(expect.not.objectContaining({secure: false}));
      });
    });

    describe('basic application server consisting of a module and a resource', () => {
      beforeEach(async () => {
        const Ravel = require('../../lib/ravel');
        const httpCodes = require('../../lib/util/http_codes');
        const $err = require('../../lib/util/application_error');
        const inject = Ravel.inject;

        // stub Module (business logic container)
        const middleware = Ravel.Module.middleware;
        @Ravel.Module('users')
        @inject('$err')
        class Users {
          constructor ($err) {
            this.$err = $err;
          }

          getAllUsers () {
            return Promise.resolve(u);
          }

          getUser (userId) {
            if (userId < u.length) {
              return Promise.resolve(u[userId - 1]);
            } else {
              return Promise.reject(new this.$err.NotFound('User id=' + userId + ' does not exist!'));
            }
          }

          @middleware('some-middleware')
          async someMiddleware (ctx, next) { await next(); }
        }

        // stub Resource (REST interface)
        // have to alias to @pre instead of proper @before, since the latter clashes with mocha
        const pre = Ravel.Resource.before;
        @inject('users', '$err')
        @Ravel.Resource('/api/user')
        class UsersResource {
          constructor (users, $err) {
            this.users = users;
            this.$err = $err;
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
            throw new this.$err.DuplicateEntry();
          }
        }

        // stub Routes (miscellaneous routes, such as templated HTML content)
        const mapping = Ravel.Routes.mapping;

        @Ravel.Routes('/')
        @mapping(Ravel.Routes.DELETE, '/app', Ravel.httpCodes.NOT_IMPLEMENTED)
        class TestRoutes {
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
        expect(Ravel.httpCodes).toBe(httpCodes);
        expect(Ravel.Error).toBe($err.General);
        app.set('log level', app.$log.NONE);
        app.set('keygrip keys', ['mysecret']);

        app.load(Users, UsersResource, TestRoutes);
        await app.init();
      });

      it('should respond with the list of registered users', (done) => {
        request(app.callback)
          .get('/api/user')
          .expect(200, JSON.stringify(u))
          .end(done);
      });

      it('should respond with a single existing user', (done) => {
        request(app.callback)
          .get('/api/user/1')
          .expect(200, JSON.stringify(u[0]))
          .end(done);
      });

      it('should respond with HTTP 404 NOT FOUND for non-existent users', (done) => {
        request(app.callback)
          .get('/api/user/3')
          .expect(404)
          .end(done);
      });

      it('should respond with CONFLICT 409 for POST users', (done) => {
        request(app.callback)
          .post('/api/user')
          .expect(409)
          .end(done);
      });

      it('should respond with html on the route GET /app', (done) => {
        request(app.callback)
          .get('/app')
          .expect(200, '<!DOCTYPE html><html></html>')
          .end(done);
      });

      it('should respond with NOT_IMPLEMENTED 501 on the route DELETE /app', (done) => {
        request(app.callback)
          .delete('/app')
          .expect(501)
          .end(done);
      });

      it('should respond with html on the route /login', (done) => {
        request(app.callback)
          .get('/login')
          .expect(200, '<!DOCTYPE html><html><head><title>login</title></head></html>')
          .end(done);
      });
    });
  });
});
