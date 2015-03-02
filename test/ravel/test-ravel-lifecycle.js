'use strict';

var chai = require('chai');
chai.use(require('sinon-chai'));
var expect = chai.expect;
var mockery = require('mockery');
var path = require('path');
var sinon = require('sinon');

var Ravel, favicon;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    var redis = require('redis-mock');
    mockery.registerMock('redis', redis);
    //add in auth, since redis-mock doesn't have it
    var oldCreateClient = redis.createClient;
    sinon.stub(redis, 'createClient', function() {
      var client = oldCreateClient.apply(redis, arguments);
      client.auth = function() {};
      return client;
    });

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.set('log level', Ravel.Log.NONE);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis port', 5432);
    Ravel.set('redis password', 'password');
    Ravel.set('app domain', 'localhost');
    Ravel.set('app port', '9080');
    Ravel.set('node domain', 'localhost');
    Ravel.set('node port', '9080');
    Ravel.set('express public directory', 'public');
    Ravel.set('express view directory', 'ejs');
    Ravel.set('express view engine', 'ejs');
    Ravel.set('express session secret', 'mysecret');
    Ravel.set('disable json vulnerability protection', true);
    Ravel.set('express favicon path', 'images/favicon.ico');

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

    Ravel.module('users', 'users');
    mockery.registerMock(path.join(Ravel.cwd, 'users'), users);
    Ravel.resource('/api/user', 'usersResource');
    mockery.registerMock(path.join(Ravel.cwd, 'usersResource'), usersResource);

    //jshint unused:false
    favicon = sinon.stub();
    favicon.returns(function(req, res, next){});
    mockery.registerMock('serve-favicon', favicon);

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#init()', function() {
    it('should initialize an express server with appropriate parameters', function(done) {
      //jshint unused:false
      var expressAppMock = new require('express')();
      var expressMock = function(){
        return expressAppMock;
      };
      expressMock.static = sinon.stub();
      expressMock.static.returns(function(req, res, next){});
      mockery.registerMock('express', expressMock);
      var setSpy = sinon.spy(expressAppMock, 'set');
      //var enableSpy = sinon.spy(expressAppMock, 'enable');
      Ravel.init();

      expect(setSpy).to.have.been.calledWith('domain', Ravel.get('node domain'));
      expect(setSpy).to.have.been.calledWith('port', Ravel.get('node port'));
      expect(setSpy).to.have.been.calledWith('app domain', Ravel.get('app domain'));
      expect(setSpy).to.have.been.calledWith('app port', Ravel.get('app port'));
      expect(setSpy).to.have.been.calledWith('views', path.join(Ravel.cwd, Ravel.get('express view directory')));
      expect(setSpy).to.have.been.calledWith('view engine', Ravel.get('express view engine'));
      expect(expressMock.static).to.have.been.calledWith(path.join(Ravel.cwd, Ravel.get('express public directory')));
      expect(favicon).to.have.been.calledWith(path.join(Ravel.cwd, Ravel.get('express favicon path')));
      //TODO test expressMock.use calls as well
      done();
    });
  });

  describe('#listen()', function() {
    it('should throw Ravel.ApplicationError.NotAllowed if called before init()', function(done) {
      try {
        Ravel.listen();
        done('Ravel should not be able to listen() before init().');
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotAllowed);
        done();
      }
    });

    it('should start the underlying HTTP server when called after init()', function(done) {
      Ravel.init();
      var listenSpy = sinon.stub(Ravel._server, 'listen', function(port, callback) {
        callback();
      });
      Ravel.listen();
      expect(listenSpy).to.have.been.calledWith(Ravel.get('node port'));
      done();
    });
  });

  describe('#start()', function() {
    it('should be a wrapper for Ravel.init() and Ravel.listen()', function(done) {
      var initSpy = sinon.stub(Ravel, 'init');
      var listenSpy = sinon.stub(Ravel, 'listen');
      Ravel.start();
      expect(initSpy).to.have.been.called;
      expect(listenSpy).to.have.been.called;
      done();
    });
  });

  describe('#close()', function() {
    it('should be a no-op if the underlying HTTP server isn\'t listening', function(done) {
      var callback = sinon.stub();
      Ravel.close(callback);
      expect(callback).to.have.been.called;
      done();
    });

    it('should stop the underlying HTTP server if the server is listening', function(done) {
      Ravel.init();
      Ravel.listen(function() {
        var closeSpy = sinon.stub(Ravel._server, 'close', function(callback) {
          callback();
        });
        Ravel.close(sinon.stub());
        //actually shut down the server to clean up
        Ravel._server.close.restore();
        Ravel._server.close(function() {
          expect(closeSpy).to.have.been.called;
          done();
        });
      });
    });
  });
});
