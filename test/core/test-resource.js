'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
const express = require('express');

let Ravel, Resource, broadcastMiddleware;

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

    Resource = require('../../lib/ravel').Resource;

    Ravel = new (require('../../lib/ravel'))();
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
    Resource = undefined;
    broadcastMiddleware = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#resource()', function() {
    it('should allow clients to register resource modules for instantiation in Ravel.start', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test'), class extends Resource {});
      Ravel.resource('./resources/test');
      expect(Ravel._resourceFactories).to.have.property('./resources/test');
      expect(Ravel._resourceFactories['./resources/test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register the same resource module twice', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test'), class extends Resource {});
      const shouldThrow = function() {
        Ravel.resource('./resources/test');
        Ravel.resource('./resources/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a resource module which is not a subclass of Resource', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = function() {
        Ravel.resource('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should produce a factory function which can be used to instantiate the specified resource module and perform dependency injection with specific, resource-related services', function(done) {
      const stub = class extends Resource {
        static get inject() {
          return ['$E', '$KV', '$Broadcast', '$MiddlewareTransaction', '$Private', '$PrivateRedirect', '$Params'];
        }

        constructor($E, $KV, $Broadcast, $MiddlewareTransaction, $Private, $PrivateRedirect, $Params) {
          super('/api/test');
          expect($E).to.equal(Ravel.ApplicationError);
          expect($KV).to.be.ok;
          expect($KV).to.be.an('object');
          expect($KV).to.equal(Ravel.kvstore);
          expect($KV).to.be.ok;
          expect($Params).to.be.ok;
          expect($Params).to.be.an('object');
          expect($Params).to.have.property('get').that.is.a('function');
          expect($Params).to.have.property('get').that.equals(Ravel.get);
          expect($Params).to.have.property('set').that.is.a('function');
          expect($Params).to.have.property('set').that.equals(Ravel.set);
          expect($Params).to.have.property('registerSimpleParameter').that.is.a('function');
          expect($Params).to.have.property('registerSimpleParameter').that.equals(Ravel.registerSimpleParameter);
          expect(this).to.have.property('basePath').that.equals('/api/test');
          expect(this).to.have.property('getAll').that.is.a('function');
          expect(this).to.have.property('putAll').that.is.a('function');
          expect(this).to.have.property('deleteAll').that.is.a('function');
          expect(this).to.have.property('get').that.is.a('function');
          expect(this).to.have.property('put').that.is.a('function');
          expect(this).to.have.property('post').that.is.a('function');
          expect(this).to.have.property('delete').that.is.a('function');
          expect($Broadcast).to.equal(Ravel.broadcast);
          expect($Private).to.equal(Ravel.authorize);
          expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
          expect($MiddlewareTransaction).to.equal(Ravel.db.middleware);
        }
      };

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      const app = express();
      const resource = Ravel._resourceFactories['test'](app);
      expect(resource.log).to.be.an('object');
      expect(resource.log).to.have.property('trace').that.is.a('function');
      expect(resource.log).to.have.property('verbose').that.is.a('function');
      expect(resource.log).to.have.property('debug').that.is.a('function');
      expect(resource.log).to.have.property('info').that.is.a('function');
      expect(resource.log).to.have.property('warn').that.is.a('function');
      expect(resource.log).to.have.property('error').that.is.a('function');
      expect(resource.log).to.have.property('critical').that.is.a('function');
      expect(resource).to.have.property('respond').that.is.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same base path', function(done) {
      const stub1 = class extends Resource {
        constructor() {
          super('/api/test');
        }
      };
      const stub2 = class extends Resource {
        constructor() {
          super('/api/test');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test1'), stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), stub2);
      Ravel.resource('test1');
      Ravel.resource('test2');
      const app = express();
      const shouldFail = function() {
        Ravel._resourceFactories['test1'](app);
        Ravel._resourceFactories['test2'](app);
      };
      expect(shouldFail).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw Ravel.ApplicationError.IllegalValue when Resource constructor super() is called without a basePath', function(done) {
      const stub = class extends Resource {
        constructor() {
          super();
        }
      };
      const app = express();
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      const test = function() {
        Ravel._resourceFactories['test'](app);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.getAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.getAll(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.get', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.get(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of POST routes via $Resource.post', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.post(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'post');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.put', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.put(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.putAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.putAll(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.deleteAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.deleteAll(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.delete', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      const stub = class extends Resource {
        constructor() {
          super('/api/test');
          this.delete(middleware1, middleware2);
        }
      };
      const app = express();
      const spy = sinon.stub(app, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2);
      done();
    });

    it('should implement stub endpoints for unused HTTP verbs, all of which return a status httpCodes.NOT_IMPLEMENTED', function(done) {
      const httpCodes = require('../../lib/util/http_codes');
      const app = express();
      const res = {
        status: function(status) {
          expect(status).to.equal(httpCodes.NOT_IMPLEMENTED);
          return {
            end: function() {}
          };
        }
      };
      const spy = sinon.spy(res, 'status');
      const expressHandler = function() {
        expect(arguments.length).to.equal(2);
        expect(arguments[1]).to.be.a('function');
        arguments[1](null, res);
      };
      sinon.stub(app, 'get', expressHandler);
      sinon.stub(app, 'post', expressHandler);
      sinon.stub(app, 'put', expressHandler);
      sinon.stub(app, 'delete', expressHandler);
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), class extends Resource {
        constructor() {
          super('/api/test');
        }
      });
      Ravel.resource('test');
      Ravel._resourceFactories['test'](app);
      expect(spy).to.have.callCount(7);
      done();
    });
  });
});
