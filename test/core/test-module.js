'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

let Ravel, Module, inject, coreSymbols;

describe('Ravel', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Module = require('../../lib/ravel').Module;
    inject = require('../../lib/ravel').inject;
    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel(Ravel.log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    Module = undefined;
    inject = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#module()', function() {
    it('should allow clients to register module files for instantiation in Ravel.start', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), class extends Module {
        constructor() {super();}
      });
      Ravel.module('./modules/test', 'test');
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test');
      expect(Ravel[coreSymbols.moduleFactories].test).to.be.a('function');
      done();
    });

    it('should allow clients to register module files with an extension and still derive the correct name', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test.js'), class extends Module {
        constructor() {super();}
      });
      Ravel.module('./modules/test.js', 'test');
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test');
      expect(Ravel[coreSymbols.moduleFactories].test).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a module without a name', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), class extends Module {
        constructor() {super();}
      });
      const shouldThrow = function() {
        Ravel.module('./modules/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple modules with the same name', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), class extends Module {
        constructor() {super();}
      });
      mockery.registerMock(upath.join(Ravel.cwd, './more_modules/test'), class extends Module {
        constructor() {super();}
      });
      const shouldThrow = function() {
        Ravel.module('./modules/test', 'test');
        Ravel.module('./more_modules/test', 'test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a module factory which can be used to instantiate the specified module and perform dependency injection', (done) => {
      const scopedStub = sinon.stub();
      Ravel.db = {
        scoped: scopedStub
      };

      const another = {};
      mockery.registerMock('another', another);
      @inject('another')
      class Stub extends Module {
        constructor(a) {
          super();
          expect(a).to.equal(another);
          expect(this.log).to.be.ok;
          expect(this.log).to.be.an('object');
          expect(this.log).to.have.property('trace').that.is.a('function');
          expect(this.log).to.have.property('verbose').that.is.a('function');
          expect(this.log).to.have.property('debug').that.is.a('function');
          expect(this.log).to.have.property('info').that.is.a('function');
          expect(this.log).to.have.property('warn').that.is.a('function');
          expect(this.log).to.have.property('error').that.is.a('function');
          expect(this.log).to.have.property('critical').that.is.a('function');
          expect(this.ApplicationError).to.equal(Ravel.ApplicationError);
          expect(this.kvstore).to.equal(Ravel.kvstore);
          expect(this.params).to.be.an.object;
          expect(this.params).to.have.a.property('get').that.is.a.function;
          expect(this.db).to.have.a.property('scoped').that.is.an.function;
          this.db.scoped();
          expect(scopedStub).to.have.been.called;
        }

        method() {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      Ravel.module('./test', 'test');
      Ravel[coreSymbols.moduleInit]();
      done();
    });

    it('should produce module factories which support dependency injection of client modules', (done) => {
      class Stub1 extends Module {
        constructor() {super();}
        method(){}
      }
      @inject('test')
      class Stub2 extends Module {
        constructor(test) {
          super();
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      Ravel.module('./modules/test', 'test');
      Ravel.module('./modules/test2', 'test2');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should not allow client modules to depend on themselves', (done) => {
      @inject('test')
      class Stub extends Module {
        constructor(test) { //eslint-disable-line no-unused-vars
          super();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub);
      Ravel.module('./modules/test', 'test');
      const test = function() {
        Ravel[coreSymbols.moduleInit]();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should instantiate modules in dependency order', (done) => {
      const instantiatedModules = {};
      class Stub1 extends Module {
        constructor() {
          super();
          instantiatedModules.test = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.not.have.property('test4');
        }
        one() {}
      }

      @inject('test', 'test4')
      class Stub2 extends Module {
        constructor(test, test4) {  //eslint-disable-line no-unused-vars
          super();

          instantiatedModules.test2 = true;
          expect(instantiatedModules).to.have.property('test');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.have.property('test4');
          expect(test).to.have.a.property('one').that.is.a.function;
          expect(test4).to.have.a.property('four').that.is.a.function;
          expect(test).to.have.a.property('log').that.is.an.object;
          expect(test4).to.have.a.property('log').that.is.an.object;
        }
        two() {}
      }

      @inject('test2')
      class Stub3 extends Module {
        constructor(test2) {  //eslint-disable-line no-unused-vars
          super();

          instantiatedModules.test3 = true;
          expect(instantiatedModules).to.have.property('test2');
          expect(test2).to.have.a.property('two').that.is.a.function;
          expect(test2).to.have.a.property('log').that.is.an.object;
        }
        three() {}
      }

      @inject('test')
      class Stub4 extends Module {
        constructor(test) { //eslint-disable-line no-unused-vars
          super();

          instantiatedModules.test4 = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.have.property('test');
          expect(test).to.have.a.property('one').that.is.a.function;
          expect(test).to.have.a.property('log').that.is.an.object;
        }
        four() {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test4'), Stub4);
      Ravel.module('./modules/test', 'test');
      Ravel.module('./modules/test2', 'test2');
      Ravel.module('./modules/test3', 'test3');
      Ravel.module('./modules/test4', 'test4');
      Ravel[coreSymbols.moduleInit]();
      done();
    });

    it('should detect basic cyclical dependencies between client modules', (done) => {
      @inject('test2')
      class Stub1 extends Module {
        constructor(test2) { //eslint-disable-line no-unused-vars
          super();
        }
      }
      @inject('test')
      class Stub2 extends Module {
        constructor(test) {  //eslint-disable-line no-unused-vars
          super();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      Ravel.module('./modules/test', 'test');
      Ravel.module('./modules/test2', 'test2');
      const test = function() {
        Ravel[coreSymbols.moduleInit]();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should detect complex cyclical dependencies between client modules', (done) => {
      class Stub1 extends Module {
        constructor() {
          super();
        }
      }
      @inject('test','test4')
      class Stub2 extends Module {
        constructor(test, test4) {  //eslint-disable-line no-unused-vars
          super();
        }
      }
      @inject('test2')
      class Stub3 extends Module {
        constructor(test2) {  //eslint-disable-line no-unused-vars
          super();
        }
      }
      @inject('test3')
      class Stub4 extends Module {
        constructor(test3) {  //eslint-disable-line no-unused-vars
          super();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test4'), Stub4);
      Ravel.module('./modules/test', 'test');
      Ravel.module('./modules/test2', 'test2');
      Ravel.module('./modules/test3', 'test3');
      Ravel.module('./modules/test4', 'test4');
      const test = function() {
        Ravel[coreSymbols.moduleInit]();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should produce a module factory which facilitates dependency injection of npm modules', (done) => {
      const stubMoment = {
        method: function() {}
      };
      @inject('moment')
      class StubClientModule extends Module {
        constructor(moment) {
          super();
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(stubMoment);
          done();
        }
        method() {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, './test'), StubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('./test', 'test');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should support array notation for specifying module dependencies which use invalid js constiable names', (done) => {
      const stubBadName = {
        method: function() {}
      };
      @inject('bad.name')
      class StubClientModule extends Module {
        constructor(badName) {
          super();
          expect(badName).to.be.ok;
          expect(badName).to.be.an('object');
          expect(badName).to.equal(stubBadName);
          done();
        }
        method() {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, './test'), StubClientModule);
      mockery.registerMock('bad.name', stubBadName);
      Ravel.module('./test', 'test');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should throw an ApplicationError.NotFound when a module factory which utilizes an unknown module/npm dependency is instantiated', (done) => {
      @inject('unknownModule')
      class Stub extends Module {
        constructor(unknownModule) {
          super();
          expect(unknownModule).to.be.an('object');
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub);
      Ravel.module('./test', 'test');
      const shouldThrow = function() {
        Ravel[coreSymbols.moduleFactories].test();
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.NotFound);
      done();
    });

    it('should allow clients to register modules which are plain classes without a static dependency injection member', (done) => {
      const Stub = class extends Module {
        constructor() {super();}
        method(){}
      };
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub);
      Ravel.module('./test', 'test');
      Ravel[coreSymbols.moduleInit]();
      expect(Ravel[coreSymbols.modules].test.method).to.be.a.function;
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a module which is not a subclass of Module', (done) => {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = function() {
        Ravel.module('./test', 'test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should perform dependency injection on module factories which works regardless of the order of specified dependencies', (done) => {
      const momentStub = {};
      mockery.registerMock('moment', momentStub);
      @inject('$E', 'moment')
      class Stub1 extends Module {
        constructor($E, moment) {
          super();
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(momentStub);
        }
      }
      @inject('moment', '$E')
      class Stub2 extends Module {
        constructor(moment, $E) {
          super();
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect(moment).to.be.ok;
          expect(moment).to.be.an('object');
          expect(moment).to.equal(momentStub);
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './test1'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './test2'), Stub2);
      Ravel.module('./test1', 'test1');
      Ravel.module('./test2', 'test2');
      Ravel[coreSymbols.moduleInit]();
    });

    it('should inject the same instance of a module into all modules which reference it', (done) => {
      class Stub1 extends Module {
        method() {}
      }
      let stub2Test;

      @inject('test')
      class Stub2 extends Module {
        constructor(test) {
          super();
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          stub2Test = test;
        }
      }

      @inject('test')
      class Stub3 extends Module {
        constructor(test) {
          super();
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          expect(test).to.equal(stub2Test);
          done();
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './test3'), Stub3);
      Ravel.module('./test', 'test');
      Ravel.module('./test2', 'test2');
      Ravel.module('./test3', 'test3');
      Ravel[coreSymbols.moduleInit]();
    });
  });
});
