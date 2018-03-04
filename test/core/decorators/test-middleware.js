'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
const upath = require('upath');
const Metadata = require('../../../lib/util/meta');

let app, middleware, coreSymbols, Module, Routes;

describe('Ravel', () => {
  describe('@cache()', () => {
    beforeEach((done) => {
      // enable mockery
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });

      const Ravel = require('../../../lib/ravel');
      Module = Ravel.Module;
      Routes = Ravel.Routes;
      app = new Ravel();
      app.log.setLevel('NONE');
      middleware = Module.middleware;
      coreSymbols = require('../../../lib/core/symbols');
      done();
    });

    afterEach((done) => {
      app = undefined;
      middleware = undefined;
      coreSymbols = undefined;
      mockery.deregisterAll();
      mockery.disable();
      done();
    });

    it('should register a Module method as injectable middleware', (done) => {
      class Stub1 {
        @middleware('some-middleware')
        async someMiddleware () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@middleware', 'some-middleware')).to.be.a('function');
      done();
    });
  });
});
