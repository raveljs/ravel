'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
const express = require('express');

let Ravel, Resource, pre, inject, broadcastMiddleware;

describe('Ravel', function() {
  beforeEach(function(done) {
    // enable mockery
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
    pre = Resource.pre;
    inject = require('../../lib/ravel').inject;

    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    // mock broadcast, kvstore, authorize, authorizeWithRedirect and db.middleware, since they only get created during Ravel.start
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
    pre = undefined;
    inject = undefined;
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
      @inject('$E', '$KV', '$Broadcast', '$MiddlewareTransaction', '$Private', '$PrivateRedirect', '$Params')
      class Stub extends Resource {
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
          expect($Broadcast).to.equal(Ravel.broadcast);
          expect($Private).to.equal(Ravel.authorize);
          expect($PrivateRedirect).to.equal(Ravel.authorizeWithRedirect);
          expect($MiddlewareTransaction).to.equal(Ravel.db.middleware);
        }
      };

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      const app = express();
      const resource = Ravel._resourceFactories.test(app);
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
        Ravel._resourceInit(app);
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
        Ravel._resourceInit(app);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.getAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @pre('middleware1', 'middleware2')
        getAll(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2, Stub.prototype.getAll);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.get', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @pre('middleware1', 'middleware2')
        get(req, res, next) {  //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2, Stub.prototype.get);
      done();
    });

    it('should facilitate the creation of POST routes via $Resource.post', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @pre('middleware1', 'middleware2')
        post(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'post');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2, Stub.prototype.post);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.put', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @pre('middleware1', 'middleware2')
        put(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2, Stub.prototype.put);
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.putAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @pre('middleware1', 'middleware2')
        putAll(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2, Stub.prototype.putAll);
      done();
    });

    it('should facilitate the creation of DELETE routes via $Resource.deleteAll', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};
      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @pre('middleware1', 'middleware2')
        deleteAll(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test', broadcastMiddleware, middleware1, middleware2, Stub.prototype.deleteAll);
      done();
    });

    it('should facilitate the creation of DELETE routes via $Resource.delete', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @pre('middleware1', 'middleware2')
        delete(req, res, next) { //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2, Stub.prototype.delete);
      done();
    });

    it('should support the use of @pre at the class level', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};

      @pre('middleware1')
      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @pre('middleware2')
        get(req, res, next) {  //eslint-disable-line no-unused-vars
        }
      }
      const app = express();
      const spy = sinon.stub(app, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel._resourceInit(app);
      expect(spy).to.have.been.calledWith('/api/test/:id', broadcastMiddleware, middleware1, middleware2, Stub.prototype.get);
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
      Ravel._resourceInit(app);
      expect(spy).to.have.callCount(7);
      done();
    });
  });
});
