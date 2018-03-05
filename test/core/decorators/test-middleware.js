'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
chai.use(require('sinon-chai'));
const upath = require('upath');
const Metadata = require('../../../lib/util/meta');

let app, middleware, Ravel, Module;

describe('Ravel', () => {
  describe('@cache()', () => {
    beforeEach((done) => {
      // enable mockery
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });

      Ravel = require('../../../lib/ravel');
      Module = Ravel.Module;
      app = new Ravel();
      app.set('log level', app.log.NONE);
      middleware = Module.middleware;
      done();
    });

    afterEach((done) => {
      app = undefined;
      middleware = undefined;
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

    it('should throw a DuplicateEntry error when middleware is registered with the same name as a module', async () => {
      class Stub1 extends Ravel.Module {
        @middleware('some-middleware')
        async someMiddleware () {}
      }
      app.set('keygrip keys', ['mysecret']);
      mockery.registerMock(upath.join(app.cwd, './mymodule'), Stub1);
      mockery.registerMock('redis', require('redis-mock'));
      app.module('./mymodule', 'some-middleware');
      try {
        await app.init();
        throw new Error('This test should fail!');
      } catch (err) {
        expect(err).to.be.instanceOf(app.ApplicationError.DuplicateEntry);
      }
    });
  });
});
