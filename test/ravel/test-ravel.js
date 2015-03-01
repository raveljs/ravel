'use strict';

var chai = require('chai');
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
var mockery = require('mockery');
var path = require('path');
var redis = require('redis-mock');
var request = require('supertest');

var Ravel, agent;

var u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];
//stub module
var users = function($E) {
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
var usersResource = function($EndpointBuilder, $Rest, users) {
  $EndpointBuilder.getAll(function(req, res) {
    users.getAllUsers(function(err, result) {
      $Rest.buildRestResponse(req, res, err, result);
    });
  });

  $EndpointBuilder.get(function(req, res) {
    users.getUser(req.params['id'], function(err, result) {
      $Rest.buildRestResponse(req, res, err, result);
    });
  });
};

describe('Ravel end-to-end', function() {
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
        Ravel = new require('../../lib-cov/ravel')();
        Ravel.set('log level', Ravel.Log.NONE);
        Ravel.set('redis host', 'localhost');
        Ravel.set('redis port', 5432);
        Ravel.set('app domain', 'localhost');
        Ravel.set('app port', '9080');
        Ravel.set('node domain', 'localhost');
        Ravel.set('node port', '9080');
        Ravel.set('express public directory', 'public');
        Ravel.set('express view directory', 'ejs');
        Ravel.set('express view engine', 'ejs');
        Ravel.set('express session secret', 'mysecret');
        Ravel.set('disable json vulnerability protection', true);

        Ravel.module('users', 'users');
        mockery.registerMock(path.join(Ravel.cwd, 'users'), users);
        Ravel.resource('/api/user', 'usersResource');
        mockery.registerMock(path.join(Ravel.cwd, 'usersResource'), usersResource);
        Ravel.init();
        agent = request.agent(Ravel._server);
        done();
      });

      after(function() {
        Ravel = undefined;
        mockery.deregisterAll();
        mockery.disable();
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

      it('should respond with HTTP 403 NOT AUTHORIZED for bad or missing csrf tokens', function(done) {
        agent
        .delete('/api/user/2')
        .expect(403)
        .end(done);
      });
    });
  });

  //TODO test that express stuff is being set correctly?
  //TODO end-to-end test websocket stuff
});
