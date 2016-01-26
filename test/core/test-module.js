'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');

let Ravel, Module, inject;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Module = require('../../lib/ravel').Module;
    inject = require('../../lib/ravel').inject;
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    Module = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#module()', function() {
    it('should allow clients to register module files for instantiation in Ravel.start', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), class extends Module {
        constructor() {super();}
      });
      Ravel.module('./modules/test');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should allow clients to register module files with an extension and still derive the correct name', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test.js'), class extends Module {
        constructor() {super();}
      });
      Ravel.module('./modules/test.js');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple modules with the same name', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), class extends Module {
        constructor() {super();}
      });
      mockery.registerMock(upath.join(Ravel.cwd, './more_modules/test'), class extends Module {
        constructor() {super();}
      });
      const shouldThrow = function() {
        Ravel.module('./modules/test');
        Ravel.module('./more_modules/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a module factory which can be used to instantiate the specified module and perform dependency injection', function(done) {
      /*jshint ignore:start*/
      @inject('$E', '$KV', '$Params')
      class Stub extends Module {
        constructor($E, $KV, $Params) {
          super();
          expect($E).to.be.ok;
          expect($E).to.be.an('object');
          expect($E).to.equal(Ravel.ApplicationError);
          expect($KV).to.be.ok;
          expect($KV).to.be.an('object');
          expect($KV).to.equal(Ravel.kvstore);
          expect($Params).to.have.property('get').that.is.a('function');
          expect($Params).to.have.property('get').that.equals(Ravel.get);
          expect($Params).to.have.property('set').that.is.a('function');
          expect($Params).to.have.property('set').that.equals(Ravel.set);
          expect($Params).to.have.property('registerSimpleParameter').that.is.a('function');
          expect($Params).to.have.property('registerSimpleParameter').that.equals(Ravel.registerSimpleParameter);
        }

        method() {}
      }
      mockery.registerMock(upath.join(Ravel.cwd, 'test'), Stub);
      /*jshint ignore:end*/
      Ravel.module('./test');
      Ravel._moduleInit();
      const instance = Ravel._modules['test'];
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

    it('should convert hyphenated module names into camel case automatically', function(done) {
      const Stub = class extends Module {constructor() {super();}};
      mockery.registerMock(upath.join(Ravel.cwd, 'my-test-module.js'), Stub);
      Ravel.module('./my-test-module.js');
      expect(Ravel._moduleFactories).to.have.property('myTestModule');
      expect(Ravel._moduleFactories['myTestModule']).to.be.a('function');
      Ravel._moduleFactories['myTestModule']();
      done();
    });

    /*jshint ignore:start*/
    it('should produce module factories which support dependency injection of client modules', function(done) {
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
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel._moduleInit();
    });
    /*jshint ignore:end*/

    it('should not allow client modules to depend on themselves', function(done) {
      /*jshint ignore:start*/
      @inject('test')
      class Stub extends Module {
        constructor(test) {
          super();
          /*jshint unused:false*/
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub);
      /*jshint ignore:end*/
      Ravel.module('./modules/test');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should instantiate modules in dependency order', function(done) {
      const instantiatedModules = {};
      /*jshint ignore:start*/
      class Stub1 extends Module {
        constructor() {
          super();
          instantiatedModules['test'] = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.not.have.property('test4');
        }
      }

      @inject('test', 'test4')
      class Stub2 extends Module {
        constructor(test, test4) {
          super();
          /*jshint unused:false*/
          instantiatedModules['test2'] = true;
          expect(instantiatedModules).to.have.property('test');
          expect(instantiatedModules).to.not.have.property('test3');
          expect(instantiatedModules).to.have.property('test4');
        }
      }

      @inject('test2')
      class Stub3 extends Module {
        constructor(test2) {
          super();
          /*jshint unused:false*/
          instantiatedModules['test3'] = true;
          expect(instantiatedModules).to.have.property('test2');
        }
      };

      @inject('test')
      class Stub4 extends Module {
        constructor(test) {
          super();
          /*jshint unused:false*/
          instantiatedModules['test4'] = true;
          expect(instantiatedModules).to.not.have.property('test2');
          expect(instantiatedModules).to.have.property('test');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test4'), Stub4);
      /*jshint ignore:end*/
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel.module('./modules/test3');
      Ravel.module('./modules/test4');
      Ravel._moduleInit();
      done();
    });

    it('should detect basic cyclical dependencies between client modules', function(done) {
      /*jshint ignore:start*/
      @inject('test2')
      class Stub1 extends Module {
        constructor(test2) {
          super();
          /*jshint unused:false*/
        }
      }
      @inject('test')
      class Stub2 extends Module {
        constructor(test) {
          super();
          /*jshint unused:false*/
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      /*jshint ignore:end*/
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    it('should detect complex cyclical dependencies between client modules', function(done) {
      /*jshint ignore:start*/
      class Stub1 extends Module {
        constructor() {
          super();
          /*jshint unused:false*/
        }
      };
      @inject('test','test4')
      class Stub2 extends Module {
        constructor(test, test4) {
          super();
          /*jshint unused:false*/
        }
      };
      @inject('test2')
      class Stub3 extends Module {
        constructor(test2) {
          super();
          /*jshint unused:false*/
        }
      };
      @inject('test3')
      class Stub4 extends Module {
        constructor(test3) {
          super();
          /*jshint unused:false*/
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test3'), Stub3);
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test4'), Stub4);
      /*jshint ignore:end*/
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel.module('./modules/test3');
      Ravel.module('./modules/test4');
      const test = function() {
        Ravel._moduleInit();
      };
      expect(test).to.throw(Ravel.ApplicationError.General);
      done();
    });

    /*jshint ignore:start*/
    it('should produce a module factory which facilitates dependency injection of npm modules', function(done) {
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
      Ravel.module('./test');
      Ravel._moduleInit();
    });
    /*jshint ignore:end*/

    /*jshint ignore:start*/
    it('should support array notation for specifying module dependencies which use invalid js constiable names', function(done) {
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
      Ravel.module('./test');
      Ravel._moduleInit();
    });
    /*jshint ignore:end*/

    it('should throw an ApplicationError.NotFound when a module factory which utilizes an unknown module/npm dependency is instantiated', function(done) {
      /*jshint ignore:start*/
      @inject('unknownModule')
      class Stub extends Module {
        constructor(unknownModule) {
          super();
          expect(unknownModule).to.be.an('object');
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub);
      /*jshint ignore:end*/
      Ravel.module('./test');
      const shouldThrow = function() {
        Ravel._moduleFactories['test']();
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.NotFound);
      done();
    });

    it('should allow clients to register modules which are plain classes without a static dependency injection member', function(done) {
      const Stub = class extends Module {
        constructor() {super();}
        method(){}
      };
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub);
      Ravel.module('./test');
      Ravel._moduleInit();
      expect(Ravel._modules.test.method).to.be.a.function;
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a module which is not a subclass of Module', function(done) {
      mockery.registerMock(upath.join(Ravel.cwd, './test'), class {});
      const shouldThrow = function() {
        Ravel.module('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should perform dependency injection on module factories which works regardless of the order of specified dependencies', function(done) {
      /*jshint unused:false*/
      const momentStub = {};
      mockery.registerMock('moment', momentStub);
      /*jshint ignore:start*/
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
      };
      mockery.registerMock(upath.join(Ravel.cwd, './test1'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './test2'), Stub2);
      /*jshint ignore:end*/
      Ravel.module('./test1');
      Ravel.module('./test2');
      Ravel._moduleInit();
    });

    it('should inject the same instance of a module into all modules which reference it', function(done) {
      /*jshint unused:false*/
      /*jshint ignore:start*/
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
      };

      @inject('test')
      class Stub3 extends Module {
        constructor(test) {
          super();
          expect(test).to.be.an('object');
          expect(test.method).to.be.a.function;
          expect(test).to.equal(stub2Test);
          done();
        }
      };
      mockery.registerMock(upath.join(Ravel.cwd, './test'), Stub1);
      mockery.registerMock(upath.join(Ravel.cwd, './test2'), Stub2);
      mockery.registerMock(upath.join(Ravel.cwd, './test3'), Stub3);
      /*jshint ignore:end*/
      Ravel.module('./test');
      Ravel.module('./test2');
      Ravel.module('./test3');
      Ravel._moduleInit();
    });
  });
});
