'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');

let Ravel, Module, coreSymbols;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    Module = require('../../lib/ravel').Module;
    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.Log.setLevel(Ravel.Log.NONE);

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    Module = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#inject()', function() {
    it('should facilitate dependency injection of client modules into other client modules', function(done) {
      const Stub1 = class extends Module {
        constructor() {super();}
        method() {}
      };
      const Stub2 = class extends Module {
        static get inject() {
          return ['test'];
        }
        constructor(test) {
          super();
          expect(test).to.be.an('object');
          expect(test).to.have.a.property('method').that.is.a.function;
          expect(test).to.have.a.property('log').that.is.an.object;
          done();
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, 'test2'), Stub2);
      Ravel.module('test');
      Ravel.module('test2');
      Ravel[coreSymbols.moduleInit]();
    });



    it('should throw an ApplicationError.IllegalValue if the static injector property is not an Array', function(done) {
      const Stub = class extends Module {
        static get inject() {
          return 'test';
        }
        constructor(test) {
          super();
          expect(test).to.be.undefined;
          done();
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      const test = function() {
        Ravel.module('test');
        Ravel[coreSymbols.moduleFactories].test();
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should facilitate dependency injection of npm modules into client modules', function(done) {
      const stubMoment = {
        method: function() {}
      };
      const stubClientModule = class extends Module {
        static get inject() {
          return ['moment'];
        }
        constructor(moment) {
          super();
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(stubMoment);
          done();
        }
        method() {}
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('test');
      Ravel[coreSymbols.injector].inject({}, stubClientModule);
    });

    it('should throw an ApplicationError.NotFound when attempting to inject an unknown module/npm dependency', function(done) {
      const stub = class extends Module {
        static get inject() {
          return ['unknownModule'];
        }
        constructor(unknownModule) {
          super();
          expect(unknownModule).to.be.an('object');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.module('test');
      try {
        Ravel[coreSymbols.injector].inject({}, stub);
        done(new Error('It should be impossible to inject an unknown module or npm dependency'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should support a module map which allows different Ravel services to make pseudo-modules available for injection. One of these, $E, is always available.', function(done) {
      const moduleMap = {
        pseudoModule: {}
      };
      const stub = class extends Module {
        static get inject() {
          return ['$E', 'pseudoModule'];
        }
        constructor($E, pseudoModule) {
          super();
          expect($E).to.equal(Ravel.ApplicationError);
          expect(pseudoModule).to.equal(moduleMap.pseudoModule);
          done();
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), stub);
      Ravel.module('test');
      Ravel[coreSymbols.injector].inject(moduleMap, stub);
    });

    it('should support array notation for declaring dependencies which are not valid js constiable names', function(done) {
      const stubBadName = {
        method: function() {}
      };
      const StubClientModule = class extends Module {
        method() {}
      };
      const AnotherStubClientModule = class extends Module {
        static get inject() {
          return ['bad.module', 'my-module'];
        }
        constructor(bad, myModule) {
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
        method() {}
      };
      mockery.registerMock(upath.join(Ravel.cwd, 'my-module.js'), StubClientModule);
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), AnotherStubClientModule);
      mockery.registerMock('bad.module', stubBadName);
      Ravel.module('my-module.js');
      Ravel.module('test');
      Ravel[coreSymbols.moduleFactories]['my-module']();
      Ravel[coreSymbols.injector].inject({}, AnotherStubClientModule);
    });
  });
});
