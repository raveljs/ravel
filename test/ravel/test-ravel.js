'use strict';

const chai = require('chai');
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
const mockery = require('mockery');
const upath = require('upath');
const redis = require('redis-mock');
const request = require('supertest');

let Ravel, agent;

const u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];
//stub module
const Users = function($E) {
  return {
    getAllUsers: function(callback) {
      callback(null, u);
    },
    getUser: function(userId, callback) {
      if (userId < u.length) {
        callback(null, u[userId-1]);
      } else {
        callback(new $E.NotFound('User id=' + userId + ' does not exist!'), null);
      }
    }
  };
};

//stub resource
const usersResource = function($Resource, $Rest, users) {
  $Resource.bind('/api/user');

  $Resource.getAll(function(req, res) {
    users.getAllUsers($Rest.respond(req, res));
  });

  $Resource.get(function(req, res) {
    users.getUser(req.params.id, $Rest.respond(req, res));
  });
};

//stub routes
const routes = function($RouteBuilder) {
  $RouteBuilder.add('/test', function(req, res) {
    res.status(200).send({});
  });
};


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
        Ravel = new (require('../../lib/ravel'))();
        Ravel.set('log level', Ravel.Log.NONE);
        Ravel.set('redis host', 'localhost');
        Ravel.set('redis port', 5432);
        Ravel.set('port', '9080');
        Ravel.set('express public directory', 'public');
        Ravel.set('express view directory', 'ejs');
        Ravel.set('express view engine', 'ejs');
        mockery.registerMock(upath.join(Ravel.cwd, 'node_modules', 'ejs'), {
          __express: function() {}
        });
        Ravel.set('express session secret', 'mysecret');
        Ravel.set('disable json vulnerability protection', true);

        mockery.registerMock(upath.join(Ravel.cwd, 'users'), Users);
        Ravel.module('users');
        mockery.registerMock(upath.join(Ravel.cwd, 'usersResource'), usersResource);
        Ravel.resource('usersResource');
        mockery.registerMock(upath.join(Ravel.cwd, 'routes'), routes);
        Ravel.routes('routes');
        Ravel.init();
        agent = request.agent(Ravel._server);
        done();
      });

      after(function(done) {
        Ravel = undefined;
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
