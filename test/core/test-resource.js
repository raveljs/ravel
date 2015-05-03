'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var mockery = require('mockery');
var path = require('path');
var sinon = require('sinon');
var express = require('express');

var Ravel, broadcastMiddleware;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    broadcastMiddleware = function(/*req, res, next*/){};
    mockery.registerMock('../ws/util/broadcast_middleware', function() {
      return broadcastMiddleware;
    });

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    //mock broadcast, kvstore, authorize, authorizeWithRedirect and db.middleware, since they only get created during Ravel.start
    Ravel.broadcast = {
      emit: function(){}
    };
    Ravel.kvstore = {};
    Ravel.db = {
      middleware: function(){}
    };
    Ravel.authorize = function() {};
    Ravel.authorizeWithRedirect = function() {};
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    broadcastMiddleware = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#resource()', function() {
    it('should allow clients to register resource modules for instantiation in Ravel.start', function(done) {
      Ravel.resource('./resources/test');
      expect(Ravel._resourceFactories).to.have.property('./resources/test');
      expect(Ravel._resourceFactories['./resources/test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register the same resource module twice', function(done) {
      var shouldThrow = function() {
        Ravel.resource('./resources/test');
        Ravel.resource('./resources/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a factory function which can be used to instantiate the specified resource module and perform dependency injection with specific, resource-related services', function(done) {
      var stub = function($E, $L, $KV, $Resource, $Rest, $Broadcast, $Private, $PrivateRedirect, $MiddlewareTransaction) {
        expect($E).to.equal(Ravel.ApplicationError);
        expect($L).to.be.an('object');
        expect($L).to.have.property('trace').that.is.a('function');
        expect($L).to.have.property('verbose').that.is.a('function');
        expect($L).to.have.property('debug').that.is.a('function');
        expect($L).to.have.property('info').that.is.a('function');
        expect($L).to.have.property('warn').that.is.a('function');
        expect($L).to.have.property('error').that.is.a('function');
        expect($L).to.have.property('critical').that.is.a('function');
        expect($KV).to.be.ok;
        expect($KV).to.be.an('object');
        expect($KV).to.equal(Ravel.kvstore);
        expect($KV).to.be.ok;
        expect($Resource).to.be.an('object');
        expect($Resource).to.have.property('bind').that.is.a('function');
        expect($Resource).to.have.property('getAll').that.is.a('function');
        expect($Resource).to.have.property('putAll').that.is.a('function');
        expect($Resource).to.have.property('deleteAll').that.is.a('function');
        expect($Resource).to.have.property('get').that.is.a('function');
        expect($Resource).to.have.property('put').that.is.a('function');
        expect($Resource).to.have.property('post').that.is.a('function');
        expect($Resource).to.have.property('delete').that.is.a('function');
        expect($Rest).to.be.an('object');
        expect($Rest).to.have.property('buildRestResponse').that.is.a('function');
        expect($Broadcast).to.equal(Ravel.broadcast);
        expect($Private).to.equal(Ravel.authorize);
        expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
        expect($MiddlewareTransaction).to.equal(Ravel.db.middleware);
        $Resource.bind('/api/test');
        done();

        return {};
      };
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      var app = express();
      Ravel._resourceFactories['test'](app);
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to bind the same resource module to multiple endpoints', function(done) {
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.bind('/api/another_endpoint');
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      var app = express();
      var shouldFail = function() {
        Ravel._resourceFactories['test'](app);
      };
      expect(shouldFail).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same base path', function(done) {
      var stub1 = function($Resource) {
        $Resource.bind('/api/test');
      };
      var stub2 = function($Resource) {
        $Resource.bind('/api/test');
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test1'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, 'test2'), stub2);
      Ravel.resource('test1');
      Ravel.resource('test2');
      var app = express();
      var shouldFail = function() {
        Ravel._resourceFactories['test1'](app);
        Ravel._resourceFactories['test2'](app);
      };
      expect(shouldFail).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw Ravel.ApplicationError.IllegalValue if $Resource is used to build an endpoint without $Resource.bind being called', function(done) {
      var stub = function($Resource) {
        $Resource.getAll(function(){});
      };
      var app = express();
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      var test = function() {
        Ravel._resourceFactories['test'](app);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.getAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.getAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'get');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.get', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.get(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'get');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of POST routes via $Resource.post', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.post(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'post');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.put', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.put(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'put');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.putAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.putAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'put');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.deleteAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.deleteAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'delete');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.delete', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.delete(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'delete');
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry when an endpoint-related method of $Resource is used twice', function(done) {
      var stub = function($Resource) {
        $Resource.bind('/api/test');
        $Resource.get();
        $Resource.get();
      };
      var app = express();
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      var shouldThrow = function() {
        Ravel._resourceFactories['test'](app);
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should implement stub endpoints for unused HTTP verbs, all of which return a status httpCodes.NOT_IMPLEMENTED', function(done) {
      var httpCodes = require('../../lib-cov/util/http_codes');
      var app = express();
      var res = {
        status: function(status) {
          expect(status).to.equal(httpCodes.NOT_IMPLEMENTED);
          return {
            end: function() {}
          };
        }
      };
      var spy = sinon.spy(res, 'status');
      var expressHandler = function() {
        expect(arguments.length).to.equal(2);
        expect(arguments[1]).to.be.a('function');
        arguments[1](null, res);
      };
      sinon.stub(app, 'get', expressHandler);
      sinon.stub(app, 'post', expressHandler);
      sinon.stub(app, 'put', expressHandler);
      sinon.stub(app, 'delete', expressHandler);
      Ravel.resource('test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), function($Resource) {
        $Resource.bind('/api/test');
      });
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.callCount(7);
      done();
    });
  });
});
