'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const upath = require('upath');
const Metadata = require('../../../lib/util/meta');

let app, cache, cacheMiddleware, coreSymbols, Routes;

describe('Ravel', () => {
  describe('@cache()', () => {
    beforeEach((done) => {
      // enable mockery
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });

      cacheMiddleware = async (ctx, next) => { await next(); };
      mockery.registerMock('../util/response_cache', class {
        middleware () { return cacheMiddleware; }
      });
      const Ravel = require('../../../lib/ravel');
      Routes = Ravel.Routes;
      app = new Ravel();
      app.log.setLevel('NONE');
      cache = Routes.cache;
      coreSymbols = require('../../../lib/core/symbols');
      done();
    });

    afterEach((done) => {
      app = undefined;
      cache = undefined;
      coreSymbols = undefined;
      mockery.deregisterAll();
      mockery.disable();
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-object type is passed to @cache', (done) => {
      const test = () => {
        @cache('hello world')
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(app.ApplicationError.IllegalValue);
      done();
    });

    it('should indicate that default options should be used when applied with no arguments', (done) => {
      class Stub1 {
        @cache
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.be.an('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.deep.equal({});
      done();
    });

    it('should indicate that default options should be used when applied with no arguments', (done) => {
      class Stub1 {
        @cache()
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.be.an('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.deep.equal({});
      done();
    });

    it('should store options when used with an options argument', (done) => {
      class Stub1 {
        @cache({expire: 60})
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.be.an('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@cache', 'options')).to.deep.equal({expire: 60});
      done();
    });

    it('should be available at the class-level as well, indicating that default options should be used when applied with no arguments', (done) => {
      @cache
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.be.an('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.deep.equal({});
      done();
    });

    it('should be available at the class-level as well, indicating that default options should be used when applied without an argument', (done) => {
      @cache()
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.be.an('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.deep.equal({});
      done();
    });

    it('should be available at the class-level as well, indicating which options should be used when applied with arguments', (done) => {
      @cache({expire: 60})
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.be.an('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@cache', 'options')).to.deep.equal({expire: 60});
      done();
    });

    it('should insert caching middleware just before Route handlers (method-level)', (done) => {
      class Stub extends Routes {
        constructor () {
          super('/app/path');
        }

        @Routes.mapping(Routes.GET, '')
        @cache
        handler () {}
      }
      mockery.registerMock(upath.join(app.cwd, 'stub'), Stub);
      app.routes('stub');
      const router = require('koa-router')();
      sinon.stub(router, 'get').callsFake(function () {
        expect(arguments[0]).to.equal('/app/path');
        expect(arguments.length === 3);
        expect(arguments[arguments.length - 2]).to.equal(cacheMiddleware);
        done();
      });
      app[coreSymbols.routesInit](router);
    });

    it('should provide open connections to Route handlers (class-level)', (done) => {
      @cache({expire: 60})
      class Stub2 extends Routes {
        constructor () {
          super('/app/another/path');
        }

        @Routes.mapping(Routes.GET, '')
        handler () {}
      }
      mockery.registerMock(upath.join(app.cwd, 'stub2'), Stub2);
      app.routes('stub2');
      const router = require('koa-router')();
      sinon.stub(router, 'get').callsFake(function () {
        expect(arguments[0]).to.equal('/app/another/path');
        expect(arguments.length === 3);
        expect(arguments[arguments.length - 2]).to.equal(cacheMiddleware);
        done();
      });
      app[coreSymbols.routesInit](router);
    });
  });
});
