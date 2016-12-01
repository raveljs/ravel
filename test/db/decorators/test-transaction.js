'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const upath = require('upath');
const ApplicationError = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');
const Ravel = require('../../../lib/ravel');
const Routes = Ravel.Routes;

let app, transaction, coreSymbols;

describe('Ravel', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    app = new Ravel();
    app.log.setLevel('NONE');
    transaction = Routes.transaction;
    coreSymbols = require('../../../lib/core/symbols');
    done();
  });

  afterEach((done) => {
    app = undefined;
    transaction = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('@transaction()', function() {

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @transaction', (done) => {
      const test = function() {
        @transaction([])
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should indicate that all connections should be opened when used with no arguments', (done) => {
      class Stub1 {
        @transaction
        get() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should indicate that all connections should be opened when used without an argument', (done) => {
      class Stub1 {
        @transaction()
        get() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should indicate which connections should be opened when used with arguments', (done) => {
      class Stub1 {
        @transaction('mysql', 'redis')
        get() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal(['mysql', 'redis']);
      done();
    });

    it('should be available at the class-level as well, indicating that all connections should be opened when used with no arguments', (done) => {
      @transaction
      class Stub1 {
        get() {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should be available at the class-level as well, indicating that all connections should be opened when used without an argument', (done) => {
      @transaction()
      class Stub1 {
        get() {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should be available at the class-level as well, indicating which connections should be opened when used with arguments', (done) => {
      @transaction('mysql', 'redis')
      class Stub1 {
        get() {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).to.deep.equal(['mysql', 'redis']);
      done();
    });

    it('should provide open connections to Route handlers (method-level)', (done) => {
      class Stub extends Routes {
        constructor() {
          super('/app/path');
        }

        @Routes.mapping(Routes.GET, '')
        @transaction('mysql', 'redis')
        handler() {}
      }
      mockery.registerMock(upath.join(app.cwd, 'stub'), Stub);
      const transactionMiddleware = async function(ctx, next){ await next(); };
      app.db = {
        middleware: sinon.stub().returns(transactionMiddleware)
      };
      app.routes('stub');
      const router = require('koa-router')();
      sinon.stub(router, 'get', function() {
        expect(app.db.middleware).to.have.been.calledWith('mysql', 'redis');
        expect(arguments[0]).to.equal('/app/path');
        expect(Array.from(arguments).indexOf(transactionMiddleware)).to.be.greaterThan(0);
        done();
      });
      app[coreSymbols.routesInit](router);
    });

    it('should provide open connections to Route handlers (mixed class-level and method-level)', (done) => {
      @transaction('rethinkdb')
      class Stub2 extends Routes {
        constructor() {
          super('/app/another/path');
        }

        @Routes.mapping(Routes.GET, '')
        @transaction('mysql', 'redis')
        handler() {}
      }
      mockery.registerMock(upath.join(app.cwd, 'stub2'), Stub2);
      const transactionMiddleware = async function(ctx, next){ await next(); };
      app.db = {
        middleware: sinon.stub().returns(transactionMiddleware)
      };
      app.routes('stub2');
      const router = require('koa-router')();
      sinon.stub(router, 'get', function() {
        expect(app.db.middleware).to.have.been.calledWith('rethinkdb', 'mysql', 'redis');
        expect(arguments[0]).to.equal('/app/another/path');
        expect(Array.from(arguments).indexOf(transactionMiddleware)).to.be.greaterThan(0);
        done();
      });
      app[coreSymbols.routesInit](router);
    });
  });
});
