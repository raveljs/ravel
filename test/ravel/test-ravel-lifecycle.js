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
    Ravel.set('koa public directory', 'public');
    Ravel.set('koa view directory', 'ejs');
    Ravel.set('koa view engine', 'ejs');
    Ravel.set('koa session secret', 'mysecret');
    Ravel.set('disable json vulnerability protection', true);
    Ravel.set('koa favicon path', 'images/favicon.ico');

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
      __koa: function() {}
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
    it('should initialize an koa server with appropriate parameters', function(done) {
      const koaAppMock = new (require('koa'))();
      const koaMock = function(){
        return koaAppMock;
      };
      koaMock.static = sinon.stub();
      koaMock.static.returns(function(req, res, next){}); //eslint-disable-line no-unused-vars
      mockery.registerMock('koa', koaMock);
      const setSpy = sinon.spy(koaAppMock, 'set');
      //const enableSpy = sinon.spy(koaAppMock, 'enable');
      Ravel.init();

      expect(setSpy).to.have.been.calledWith('views', upath.join(Ravel.cwd, Ravel.get('koa view directory')));
      expect(setSpy).to.have.been.calledWith('view engine', Ravel.get('koa view engine'));
      expect(koaMock.static).to.have.been.calledWith(upath.join(Ravel.cwd, Ravel.get('koa public directory')));
      expect(favicon).to.have.been.calledWith(upath.join(Ravel.cwd, Ravel.get('koa favicon path')));
      //TODO test koaMock.use calls as well
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
      const listenSpy = sinon.stub(Ravel.server, 'listen', function(port, callback) {
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
        const closeSpy = sinon.stub(Ravel.server, 'close', function(callback) {
          callback();
        });
        Ravel.close(sinon.stub());
        //actually shut down the server to clean up
        Ravel.server.close.restore();
        Ravel.server.close(function() {
          expect(closeSpy).to.have.been.called;
          done();
        });
      });
    });
  });
});
