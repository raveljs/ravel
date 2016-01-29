'use strict';

const chai = require('chai');
chai.use(require('sinon-chai'));
const expect = chai.expect;
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');

let Ravel, favicon;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    const redis = require('redis-mock');
    mockery.registerMock('redis', redis);
    //add in auth, since redis-mock doesn't have it
    const oldCreateClient = redis.createClient;
    sinon.stub(redis, 'createClient', function() {
      const client = oldCreateClient.apply(redis, arguments);
      client.auth = function() {};
      return client;
    });

    Ravel = new (require('../../lib/ravel'))();
    Ravel.set('log level', Ravel.Log.NONE);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis port', 5432);
    Ravel.set('redis password', 'password');
    Ravel.set('port', '9080');
    Ravel.set('express public directory', 'public');
    Ravel.set('express view directory', 'ejs');
    Ravel.set('express view engine', 'ejs');
    Ravel.set('express session secret', 'mysecret');
    Ravel.set('disable json vulnerability protection', true);
    Ravel.set('express favicon path', 'images/favicon.ico');

    const u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];

    //stub module
    const users = function($E) {
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
    const usersResource = function($Resource, $Rest, users2) {
      $Resource.bind('/api/user');

      $Resource.getAll(function(req, res) {
        users2.getAllUsers($Rest.respond(req, res));
      });

      $Resource.get(function(req, res) {
        users2.getUser(req.params.id, $Rest.respond(req, res));
      });
    };

    mockery.registerMock(upath.join(Ravel.cwd, 'users'), users);
    Ravel.module('users');
    mockery.registerMock(upath.join(Ravel.cwd, 'usersResource'), usersResource);
    Ravel.resource('usersResource');

    favicon = sinon.stub();
    favicon.returns(function(req, res, next){}); //eslint-disable-line no-unused-vars
    mockery.registerMock('serve-favicon', favicon);

    mockery.registerMock(upath.join(Ravel.cwd, 'node_modules', 'ejs'), {
      __express: function() {}
    });

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
      const expressAppMock = new (require('express'))();
      const expressMock = function(){
        return expressAppMock;
      };
      expressMock.static = sinon.stub();
      expressMock.static.returns(function(req, res, next){}); //eslint-disable-line no-unused-vars
      mockery.registerMock('express', expressMock);
      const setSpy = sinon.spy(expressAppMock, 'set');
      //const enableSpy = sinon.spy(expressAppMock, 'enable');
      Ravel.init();

      expect(setSpy).to.have.been.calledWith('views', upath.join(Ravel.cwd, Ravel.get('express view directory')));
      expect(setSpy).to.have.been.calledWith('view engine', Ravel.get('express view engine'));
      expect(expressMock.static).to.have.been.calledWith(upath.join(Ravel.cwd, Ravel.get('express public directory')));
      expect(favicon).to.have.been.calledWith(upath.join(Ravel.cwd, Ravel.get('express favicon path')));
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
      const listenSpy = sinon.stub(Ravel._server, 'listen', function(port, callback) {
        callback();
      });
      Ravel.listen();
      expect(listenSpy).to.have.been.calledWith(Ravel.get('port'));
      done();
    });
  });

  describe('#start()', function() {
    it('should be a wrapper for Ravel.init() and Ravel.listen()', function(done) {
      const initSpy = sinon.stub(Ravel, 'init');
      const listenSpy = sinon.stub(Ravel, 'listen');
      Ravel.start();
      expect(initSpy).to.have.been.called;
      expect(listenSpy).to.have.been.called;
      done();
    });
  });

  describe('#close()', function() {
    it('should be a no-op if the underlying HTTP server isn\'t listening', function(done) {
      const callback = sinon.stub();
      Ravel.close(callback);
      expect(callback).to.have.been.called;
      done();
    });

    it('should stop the underlying HTTP server if the server is listening', function(done) {
      Ravel.init();
      Ravel.listen(function() {
        const closeSpy = sinon.stub(Ravel._server, 'close', function(callback) {
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
