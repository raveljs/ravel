'use strict';

const chai = require('chai');
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
const upath = require('upath');
const redis = require('redis-mock');
const request = require('supertest');

const Ravel = require('../../lib/ravel');
const inject = Ravel.inject;
const pre = Ravel.before;
let app, agent;

const u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];
//stub module
@inject('$E')
class Users extends Ravel.Module {
  constructor($E) {
    super();
    this.$E = $E;
  }

  getAllUsers() {
    return Promise.resolve(u);
  }

  getUser(userId) {
    if (userId < u.length) {
      return Promise.resolve(u[userId-1]);
    } else {
      return Promise.reject(new this.$E.NotFound('User id=' + userId + ' does not exist!'));
    }
  }
}

@inject('users')
class UsersResource extends Ravel.Resource {
  constructor(users) {
    super('/api/user');
    this.users = users;
  }

  @pre('respond')
  getAll(ctx) {
    // FIXME this is a koa context. how do we refer to stuff in self?
    return this.users.getAllUsers()
    .then((list) => {
      ctx.body = list;
    });
  }

  @pre('respond')
  get(ctx) {
    return this.users.getUser(this.params.id).then((result) => {
      ctx.body = result;
    });
  }
}

//stub routes
const mapping = Ravel.Routes.mapping;
class TestRoutes extends Ravel.Routes {
  constructor() {
    super();
  }

  @mapping('/test')
  handler() {
    this.body = {};
    this.status = 200;
  }
}


describe('Ravel end-to-end test', function() {
  before(function(done) {
    done();
  });

  after(function(done) {
    done();
  });

  describe('#listen()', function() {
    describe('basic application server consisting of a module and a resource', function() {
      before(function(done) {
        //enable mockery
        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });
        mockery.registerMock('redis', redis);
        app = new Ravel();
        app.set('log level', app.Log.NONE);
        app.set('redis host', 'localhost');
        app.set('redis port', 5432);
        app.set('port', '9080');
        app.set('koa public directory', 'public');
        app.set('keygrip keys', ['mysecret']);

        mockery.registerMock(upath.join(app.cwd, 'users'), Users);
        app.module('users');
        mockery.registerMock(upath.join(app.cwd, 'usersResource'), UsersResource);
        app.resource('usersResource');
        mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
        app.routes('routes');
        app.init();
        agent = request.agent(app.server);
        done();
      });

      after(function(done) {
        app = undefined;
        mockery.deregisterAll();
        mockery.disable();
        done();
      });

      it('should respond with the list of registered users', function(done) {
        agent
        .get('/api/user')
        .expect(200, JSON.stringify(u))
        .end(done);
      });

      it('should respond with a single existing user', function(done) {
        agent
        .get('/api/user/1')
        .expect(200, JSON.stringify(u[0]))
        .end(done);
      });

      it('should respond with HTTP 404 NOT FOUND for non-existent users', function(done) {
        agent
        .get('/api/user/3')
        .expect(404)
        .end(done);
      });

      it('should respond with an empty object on the route', function(done) {
        agent
        .get('/test')
        .expect(200, JSON.stringify({}))
        .end(done);
      });
    });
  });

  //TODO end-to-end test websocket stuff
});
