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
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    app = new Ravel();
    transaction = Routes.transaction;
    coreSymbols = require('../../../lib/core/symbols');
    done();
  });

  afterEach(function(done) {
    app = undefined;
    transaction = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('@transaction()', function() {

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @transaction', function(done) {
      const test = function() {
        @transaction([])
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should indicate that all connections should be opened when used without an argument', function(done) {
      class Stub1 {
        @transaction()
        get() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should indicate which connections should be opened when used with arguments', function(done) {
      class Stub1 {
        @transaction('mysql', 'redis')
        get() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal(['mysql', 'redis']);
      done();
    });

    it('should provide ', function(done) {
      class Stub extends Routes {
        constructor() {
          super('/app/path');
        }

        @Routes.mapping(Routes.GET, '')
        @transaction('mysql', 'redis')
        handler() {}
      }
      mockery.registerMock(upath.join(app.cwd, 'stub'), Stub);
      const transactionMiddleware = function*(next){ yield next; };
      app.db = {
        middleware: sinon.stub().returns(transactionMiddleware)
      };
      app.routes('stub');
      const router = require('koa-router')();
      sinon.stub(router, 'get', function() {
        expect(app.db.middleware).to.have.been.calledWith('mysql', 'redis');
        expect(arguments[0]).to.equal('/app/path');
        expect(arguments[1]).to.equal(transactionMiddleware);
        done();
      });
      app[coreSymbols.routesInit](router);
    });
  });
});
