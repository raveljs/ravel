'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
const request = require('supertest');
const koa = require('koa');

let Ravel, Resource, before, inject, coreSymbols;

describe('Ravel', function() {
  beforeEach(function(done) {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Resource = require('../../lib/ravel').Resource;
    before = Resource.before;
    inject = require('../../lib/ravel').inject;
    coreSymbols = require('../../lib/core/symbols');

    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    // mock kvstore and db.middleware, since they only get created during Ravel.start
    Ravel.kvstore = {};
    Ravel.db = {
      middleware: function(){}
    };
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    Resource = undefined;
    before = undefined;
    inject = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#resource()', function() {
    it('should allow clients to register resource modules for instantiation in Ravel.start', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test'), class extends Resource {});
      Ravel.resource('./resources/test');
      expect(Ravel[coreSymbols.resourceFactories]).to.have.property('./resources/test');
      expect(Ravel[coreSymbols.resourceFactories]['./resources/test']).to.be.a('function');
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
      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Resource {
        constructor(a) {
          super('/api/test');
          expect(a).to.equal(another);
          expect(this).to.have.property('basePath').that.equals('/api/test');
        }
      };

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      const router = require('koa-router')();
      const resource = Ravel[coreSymbols.resourceFactories].test(router);
      expect(resource.log).to.be.an('object');
      expect(resource.log).to.have.property('trace').that.is.a('function');
      expect(resource.log).to.have.property('verbose').that.is.a('function');
      expect(resource.log).to.have.property('debug').that.is.a('function');
      expect(resource.log).to.have.property('info').that.is.a('function');
      expect(resource.log).to.have.property('warn').that.is.a('function');
      expect(resource.log).to.have.property('error').that.is.a('function');
      expect(resource.log).to.have.property('critical').that.is.a('function');
      expect(resource).to.have.property('respond').that.is.a('function');
      expect(resource.ApplicationError).to.equal(Ravel.ApplicationError);
      expect(resource.kvstore).to.equal(Ravel.kvstore);
      expect(resource.params).to.be.an.object;
      expect(resource.params).to.have.a.property('get').that.is.a.function;
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
      const router = require('koa-router')();
      const shouldFail = function() {
        Ravel[coreSymbols.resourceInit](router);
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
      const router = require('koa-router')();
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.resource('test');
      const test = function() {
        Ravel[coreSymbols.resourceInit](router);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.getAll', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @before('middleware1', 'middleware2')
        getAll() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of GET routes via $Resource.get', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        get() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test/:id', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of POST routes via $Resource.post', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @before('middleware1', 'middleware2')
        post() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'post');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.put', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        put() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test/:id', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of PUT routes via $Resource.putAll', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @before('middleware1', 'middleware2')
        putAll() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'put');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of DELETE routes via $Resource.deleteAll', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        deleteAll() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should facilitate the creation of DELETE routes via $Resource.delete', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }

        @before('middleware1', 'middleware2')
        delete() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'delete');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test/:id', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should support the use of @before at the class level', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      @before('middleware1')
      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware2')
        get() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test/:id', middleware1, middleware2, sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });

    it('should implement stub endpoints for unused HTTP verbs, all of which return a status httpCodes.NOT_IMPLEMENTED', function(done) {
      const httpCodes = require('../../lib/util/http_codes');
      const router = require('koa-router')();
      const res = {
        status: function(status) {
          expect(status).to.equal(httpCodes.NOT_IMPLEMENTED);
          return {
            end: function() {}
          };
        }
      };
      const spy = sinon.spy(res, 'status');
      const koaHandler = function() {
        expect(arguments.length).to.equal(2);
        expect(arguments[1]).to.be.a('function');
        arguments[1](null, res);
      };
      sinon.stub(router, 'get', koaHandler);
      sinon.stub(router, 'post', koaHandler);
      sinon.stub(router, 'put', koaHandler);
      sinon.stub(router, 'delete', koaHandler);
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), class extends Resource {
        constructor() {
          super('/api/test');
        }
      });
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.callCount(7);
      done();
    });

    it('should facilitate the creation of routes which are not decorated with middleware', function(done) {
      class Stub extends Resource {
        constructor() {
          super('/api/test');
        }
        getAll() {
        }
      }
      const router = require('koa-router')();
      const spy = sinon.stub(router, 'get');
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);
      expect(spy).to.have.been.calledWith('/api/test', sinon.match(function(value) {
        return value.constructor.name === 'GeneratorFunction';
      }));
      done();
    });
  });

  describe('Resource Integration Test', function() {
    it('should integrate properly with koa and koa-router', function(done) {
      const middleware1 = function*(next) { yield next; };
      const middleware2 = function*(next) { yield next; };

      class Stub extends Resource {
        constructor() {
          super('/api/test');
          this.middleware1 = middleware1;
          this.middleware2 = middleware2;
        }

        @before('middleware1', 'middleware2')
        get(ctx) {
          ctx.body = ctx.params;
        }
      }
      const router = require('koa-router')();
      const app = koa();

      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.resource('test');
      Ravel[coreSymbols.resourceInit](router);

      app.use(router.routes());
      app.use(router.allowedMethods());

      request(app.callback())
      .get('/api/test/1')
      .expect(200, {id: 1}, done);
    });
  });
});
