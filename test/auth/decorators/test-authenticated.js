'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const sinon = require('sinon');
const upath = require('upath');
const Metadata = require('../../../lib/util/meta');

let authenticated;

describe('Routes', function() {
  beforeEach(function(done) {
    authenticated = require('../../../lib/ravel').Routes.authenticated;
    done();
  });

  afterEach(function(done) {
    authenticated = undefined;
    done();
  });

  describe('@authenticated()', function() {
    it('should decorate a class indicating that auth middleware should precede every endpoint defined within', function(done) {
      @authenticated
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.deep.equal({});
      done();
    });

    it('should decorate a class indicating that auth middleware should precede every endpoint defined within (no args)', function(done) {
      @authenticated()
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.deep.equal({});
      done();
    });

    it('should decorate a class indicating that auth middleware which supports configuration should precede every endpoint defined within', function(done) {
      @authenticated({
        redirect: true,
        register: false
      })
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).to.deep.equal({
        redirect: true,
        register: false
      });
      done();
    });

    it('should decorate a method indicating that auth middleware should precede it', function(done) {
      class Stub1 {
        @authenticated
        handler() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.deep.equal({});
      done();
    });

    it('should decorate a method indicating that auth middleware that should precede it (no args)', function(done) {
      class Stub1 {
        @authenticated()
        handler() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.deep.equal({});
      done();
    });

    it('should decorate a method indicating that auth middleware which supports configuration should precede it', function(done) {
      class Stub1 {
        @authenticated({
          redirect: true,
          register: false
        })
        handler() {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.be.an.object;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).to.deep.equal({
        redirect: true,
        register: false
      });
      done();
    });

    describe('auth middleware insertion', function() {
      const authenticationMiddleware = function*(next){ yield next; };
      let Ravel, Routes, coreSymbols;

      beforeEach(function(done) {
        //enable mockery
        mockery.enable({
          useCleanCache: true,
          warnOnReplace: false,
          warnOnUnregistered: false
        });
        const AuthenticateRequest = class {};
        AuthenticateRequest.prototype.middleware = authenticationMiddleware;
        mockery.registerMock('../auth/authenticate_request', AuthenticateRequest);
        Ravel = require('../../../lib/ravel');
        Routes = Ravel.Routes;
        authenticated = Routes.authenticated;
        coreSymbols = require('../../../lib/core/symbols');
        done();
      });

      afterEach(function(done) {
        mockery.deregisterAll();mockery.disable();
        authenticated = undefined;
        Ravel = undefined;
        Routes = undefined;
        coreSymbols = undefined;
        done();
      });

      it('should decorate route handlers with authentication-enforcing middleware', function(done) {
        class Stub extends Routes {
          constructor() {
            super('/app/path');
          }

          @Routes.mapping(Routes.GET, '')
          @Routes.authenticated
          handler() {}
        }
        const app = new Ravel();
        app.log.setLevel('NONE');
        mockery.registerMock(upath.join(app.cwd, 'stub'), Stub);
        app.routes('stub');
        const router = require('koa-router')();
        sinon.stub(router, 'get', function() {
          expect(arguments[0]).to.equal('/app/path');
          expect(arguments[1]).to.be.a.function;
          expect(arguments[1]).to.equal(authenticationMiddleware);
          done();
        });
        app[coreSymbols.routesInit](router);
      });

      it('should decorate all route handlers with authentication-enforcing middleware when used at the class-level', function(done) {
        @Routes.authenticated
        class Stub extends Routes {
          constructor() {
            super('/app/path');
          }

          @Routes.mapping(Routes.GET, '')
          handler() {}
        }
        const app = new Ravel();
        app.log.setLevel('NONE');
        mockery.registerMock(upath.join(app.cwd, 'stub'), Stub);
        app.routes('stub');
        const router = require('koa-router')();
        sinon.stub(router, 'get', function() {
          expect(arguments[0]).to.equal('/app/path');
          expect(arguments[1]).to.be.a.function;
          expect(arguments[1]).to.equal(authenticationMiddleware);
          done();
        });
        app[coreSymbols.routesInit](router);
      });

    });
  });
});
