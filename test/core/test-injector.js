'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');

let Ravel, Module, coreSymbols, inject;

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    Module = require('../../lib/ravel').Module;
    Ravel = new (require('../../lib/ravel'))();
    inject = require('../../lib/ravel').inject;
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel(Ravel.log.NONE);

    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    Module = undefined;
    coreSymbols = undefined;
    inject = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#inject()', () => {
    it('should facilitate dependency injection of client modules into other client modules', (done) => {
      const Stub1 = class extends Module {
        method () {}
      };

      @inject('test')
      class Stub2 extends Module {
        constructor (test) {
          super();
          expect(test).to.be.an('object');
          expect(test).to.have.a.property('method').that.is.a.function;
          expect(test).to.have.a.property('log').that.is.an.object;
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), Stub2);
      Ravel.module('test', 'test');
      Ravel.module('test2', 'test2');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should function on modules exporting plain node classes as well', (done) => {
      const Stub1 = class {
        method () {}
      };

      @inject('test')
      class Stub2 {
        constructor (test) {
          expect(test).to.be.an('object');
          expect(test).to.have.a.property('method').that.is.a.function;
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), Stub2);
      Ravel.module('test', 'test');
      Ravel.module('test2', 'test2');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should facilitate dependency injection of npm modules into client modules', (done) => {
      const stubMoment = {
        method: () => {}
      };
      @inject('moment')
      class Stub extends Module {
        constructor (moment) {
          super();
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(stubMoment);
          done();
        }
        method () {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('test', 'test');
      Ravel[coreSymbols.injector].inject({}, Stub);
    });

    it('should facilitate dependency injection of npm modules into plain client modules', (done) => {
      const stubMoment = {
        method: () => {}
      };
      @inject('moment')
      class Stub {
        constructor (moment) {
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(stubMoment);
          done();
        }
        method () {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('test', 'test');
      Ravel[coreSymbols.injector].inject({}, Stub);
    });

    it('should throw an ApplicationError.NotFound when attempting to inject an unknown module/npm dependency', (done) => {
      @inject('unknownModule')
      class Stub extends Module {
        static get inject () {
          return ['unknownModule'];
        }
        constructor (unknownModule) {
          super();
          expect(unknownModule).to.be.an('object');
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.module('test', 'test');
      try {
        Ravel[coreSymbols.injector].inject({}, Stub);
        done(new Error('It should be impossible to inject an unknown module or npm dependency'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should support a module map which allows different Ravel services to make pseudo-modules available for injection.', (done) => {
      const moduleMap = {
        pseudoModule: {}
      };
      @inject('pseudoModule')
      class Stub extends Module {
        constructor (pseudoModule) {
          super();
          expect(pseudoModule).to.equal(moduleMap.pseudoModule);
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.module('test', 'test');
      Ravel[coreSymbols.injector].inject(moduleMap, Stub);
    });

    it('should support array notation for declaring dependencies which are not valid js constiable names', (done) => {
      const stubBadName = {
        method: () => {}
      };
      const StubClientModule = class extends Module {
        method () {}
      };
      @inject('bad.module', 'my-module')
      class AnotherStubClientModule extends Module {
        constructor (bad, myModule) {
          super();
          expect(bad).to.be.ok;
          expect(bad).to.be.an('object');
          expect(bad).to.equal(stubBadName);
          expect(myModule).to.be.ok;
          expect(myModule).to.be.an('object');
          expect(myModule).to.have.a.property('log').that.is.an.object;
          expect(myModule).to.have.a.property('method').that.is.a.function;
          done();
        }
        method () {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'my-module.js'), StubClientModule);
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), AnotherStubClientModule);
      mockery.registerMock('bad.module', stubBadName);
      Ravel.module('my-module.js', 'my-module');
      Ravel.module('test', 'test');
      Ravel[coreSymbols.moduleFactories]['my-module']();
      Ravel[coreSymbols.injector].inject({}, AnotherStubClientModule);
    });
  });
});
