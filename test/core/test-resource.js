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
    it('should allow clients to register resource modules for instantiation in Ravel.start, and assign them a base path', function(done) {
      Ravel.resource('/api/test', './resources/test');
      expect(Ravel._resourceFactories).to.have.property('/api/test');
      expect(Ravel._resourceFactories['/api/test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same base path', function(done) {
      try {
        Ravel.resource('/api/test', './resources/test');
        Ravel.resource('/api/test', './resources/test2');
        done(new Error('It should be impossible to register two resource modules with the same base path.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should produce a factory function which can be used to instantiate the specified resource module and perform dependency injection with specific, resource-related services', function(done) {
      var stub = function($E, $L, $KV, $EndpointBuilder, $Rest, $Broadcast, $Private, $PrivateRedirect, $MiddlewareTransaction) {
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
        expect($EndpointBuilder).to.be.an('object');
        expect($EndpointBuilder).to.have.property('getAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('putAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('deleteAll').that.is.a('function');
        expect($EndpointBuilder).to.have.property('get').that.is.a('function');
        expect($EndpointBuilder).to.have.property('put').that.is.a('function');
        expect($EndpointBuilder).to.have.property('post').that.is.a('function');
        expect($EndpointBuilder).to.have.property('delete').that.is.a('function');
        expect($Rest).to.be.an('object');
        expect($Rest).to.have.property('buildRestResponse').that.is.a('function');
        expect($Broadcast).to.equal(Ravel.broadcast);
        expect($Private).to.equal(Ravel.authorize);
        expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
        expect($MiddlewareTransaction).to.equal(Ravel.db.middleware);
        done();

        return {};
      };
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      var app = express();
      Ravel._resourceFactories['/api/test'](app);
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.getAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.getAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'get');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.get', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.get(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'get');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of POST routes via $EndpointBuilder.post', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.post(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'post');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $EndpointBuilder.put', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.put(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'put');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $EndpointBuilder.putAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.putAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'put');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.deleteAll', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.deleteAll(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'delete');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $EndpointBuilder.delete', function(done) {
      var middleware1 = function(/*req, res*/) {};
      var middleware2 = function(/*req, res*/) {};
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.delete(middleware1, middleware2);
      };
      var app = express();
      var spy = sinon.stub(app, 'delete');
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry when a method of $EndpointBuilder is used twice', function(done) {
      var stub = function($EndpointBuilder) {
        $EndpointBuilder.get();
        $EndpointBuilder.get();
      };
      var app = express();
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      try {
        Ravel._resourceFactories['/api/test'](app);
        done(new Error('client should not be able to use a method of $EndpointBuilder twice'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should implement stub endpoints for unused HTTP verbs, all of which return a status rest.NOT_IMPLEMENTED', function(done) {
      var rest = require('../../lib-cov/util/rest')(Ravel);
      var app = express();
      var res = {
        status: function(status) {
          expect(status).to.equal(rest.NOT_IMPLEMENTED);
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
      Ravel.resource('/api/test', 'test');
      mockery.registerMock(path.join(Ravel.cwd, 'test'), function() {});
      Ravel._resourceFactories['/api/test'](app);
      expect(spy).to.have.callCount(7);
      done();
    });
  });
});
