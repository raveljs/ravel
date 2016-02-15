'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');

let Ravel, Routes, inject, mapping, before, coreSymbols;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Routes = require('../../lib/ravel').Routes;
    inject = require('../../lib/ravel').inject;
    before = Routes.before;
    mapping = Routes.mapping;
    coreSymbols = require('../../lib/core/symbols');
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    inject = undefined;
    Routes = undefined;
    mapping = undefined;
    before = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#routes()', function() {
    it('should permit clients to register route modules for instantiation in Ravel.start', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './routes/index_r'), class extends Routes {});
      Ravel.routes('./routes/index_r');
      expect(Ravel[coreSymbols.routesFactories]).to.have.property('./routes/index_r');
      expect(Ravel[coreSymbols.routesFactories]['./routes/index_r']).to.be.a('function');
      done();
    });

    it('should throw ApplicationError.DuplicateEntry when a client attempts to register the same route module twice', function(done) {
      try {
        mockery.registerMock(upath.join(Ravel.cwd, './routes/index_r'), class extends Routes {});
        Ravel.routes('./routes/index_r');
        Ravel.routes('./routes/index_r');
        done(new Error('Registering the same route module twice should be impossible'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
    });

    it('should produce a factory function which can be used to instantiate the specified routes module and perform dependency injection', function(done) {
      @inject('$E', '$KV')
      class Stub extends Routes {
        constructor($E, $KV) {
          super();
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect($KV).to.equal(Ravel.kvstore);
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'stub'), Stub);
      Ravel.routes('stub');
      const instance = Ravel[coreSymbols.routesFactories].stub();
      expect(instance.log).to.be.ok;
      expect(instance.log).to.be.an('object');
      expect(instance.log).to.have.property('trace').that.is.a('function');
      expect(instance.log).to.have.property('verbose').that.is.a('function');
      expect(instance.log).to.have.property('debug').that.is.a('function');
      expect(instance.log).to.have.property('info').that.is.a('function');
      expect(instance.log).to.have.property('warn').that.is.a('function');
      expect(instance.log).to.have.property('error').that.is.a('function');
      expect(instance.log).to.have.property('critical').that.is.a('function');
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a routes module which is not a subclass of Routes', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = function() {
        Ravel.routes('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate the creation of GET routes via , but not permit the use of other HTTP verbs', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};

      class Stub extends Routes {
        constructor() {
          super('/app');
        }

        @mapping('/path')
        @before('middleware1','middleware2')
        pathHandler(ctx) {
          ctx.status = 200;
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'stub'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.routes('stub');

      //load up koa
      const router = require('koa-router')();
      sinon.stub(router, 'get', function() {
        expect(arguments[0]).to.equal('/app/path');
        expect(arguments[1]).to.equal(middleware1);
        expect(arguments[2]).to.equal(middleware2);
        done();
      });
      sinon.stub(router, 'post', function() {
        done(new Error('Routes class should never use app.post.'));
      });
      sinon.stub(router, 'put', function() {
        done(new Error('Routes class should never use app.put.'));
      });
      sinon.stub(router, 'delete', function() {
        done(new Error('Routes class should never use app.delete.'));
      });
      Ravel[coreSymbols.routesInit](router);
    });

    it('should support the use of @before at the class level as well', function(done) {
      const middleware1 = function(/*req, res*/) {};
      const middleware2 = function(/*req, res*/) {};

      @before('middleware1')
      class Stub extends Routes {
        constructor() {
          super('/app');
        }

        @mapping('/path')
        @before('middleware2')
        pathHandler(ctx) {
          ctx.status(200);
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'stub'), Stub);
      mockery.registerMock('middleware1', middleware1);
      mockery.registerMock('middleware2', middleware2);
      Ravel.routes('stub');

      //load up koa
      const router = require('koa-router')();
      sinon.stub(router, 'get', function() {
        expect(arguments[0]).to.equal('/app/path');
        expect(arguments[1]).to.equal(middleware1);
        expect(arguments[2]).to.equal(middleware2);
        done();
      });
      sinon.stub(router, 'post', function() {
        done(new Error('Routes class should never use app.post.'));
      });
      sinon.stub(router, 'put', function() {
        done(new Error('Routes class should never use app.put.'));
      });
      sinon.stub(router, 'delete', function() {
        done(new Error('Routes class should never use app.delete.'));
      });
      Ravel[coreSymbols.routesInit](router);
    });
  });
});
