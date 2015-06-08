'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var path = require('path');

var Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#module()', function() {
    it('should allow clients to register module files for instantiation in Ravel.start', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), function(){});
      Ravel.module('./modules/test');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should allow clients to register module files with an extension and still derive the correct name', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test.js'), function(){});
      Ravel.module('./modules/test.js');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple modules with the same name', function(done) {
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), function(){});
      mockery.registerMock(path.join(Ravel.cwd, './more_modules/test'), function(){});
      var shouldThrow = function() {
        Ravel.module('./modules/test');
        Ravel.module('./more_modules/test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should produce a module factory which can be used to instantiate the specified module and perform dependency injection', function(done) {
      var stub = function($E, $L, $KV) {
        expect($E).to.be.ok;
        expect($E).to.be.an('object');
        expect($E).to.equal(Ravel.ApplicationError);
        expect($L).to.be.ok;
        expect($L).to.be.an('object');
        expect($L).to.have.property('trace').that.is.a('function');
        expect($L).to.have.property('verbose').that.is.a('function');
        expect($L).to.have.property('debug').that.is.a('function');
        expect($L).to.have.property('info').that.is.a('function');
        expect($L).to.have.property('warn').that.is.a('function');
        expect($L).to.have.property('error').that.is.a('function');
        expect($L).to.have.property('critical').that.is.a('function');
        expect($KV).to.be.ok;
        expect($KV).to.be.an('object');
        expect($KV).to.equal(Ravel.kvstore);
        done();

        return {
          method: function() {}
        };
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel.module('./test');
      Ravel._moduleFactories['test']();
    });

    it('should convert hyphenated module names into camel case automatically', function(done) {
      var stub = function() {
        return {};
      };
      mockery.registerMock(path.join(Ravel.cwd, 'my-test-module.js'), stub);
      Ravel.module('./my-test-module.js');
      expect(Ravel._moduleFactories).to.have.property('myTestModule');
      expect(Ravel._moduleFactories['myTestModule']).to.be.a('function');
      Ravel._moduleFactories['myTestModule']();
      done();
    });

    it('should produce module factories which support dependency injection of client modules', function(done) {
      var stub1Instance = {
        method:function(){}
      };
      var stub1 = function() {
        return stub1Instance;
      };
      var stub2 = function(test) {
        expect(test).to.be.an('object');
        expect(test).to.deep.equal(stub1Instance);
        done();
        return {};
      };
      mockery.registerMock(path.join(Ravel.cwd, './modules/test'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2'), stub2);
      Ravel.module('./modules/test');
      Ravel.module('./modules/test2');
      Ravel._moduleFactories['test']();
      Ravel._moduleFactories['test2']();
    });

    it('should produce a module factory which facilitates dependency injection of npm modules', function(done) {
      var stubMoment = {
        method: function() {}
      };
      var stubClientModule = function(moment) {
        expect(moment).to.be.ok;
        expect(moment).to.be.an('object');
        expect(moment).to.equal(stubMoment);
        done();

        return {
          method: function() {}
        };
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('./test');
      Ravel._moduleFactories['test']();
    });

    it('should support array notation for specifying module dependencies which use invalid js variable names', function(done) {
      var stubBadName = {
        method: function() {}
      };
      var stubClientModule = ['bad.name', function(badName) {
        expect(badName).to.be.ok;
        expect(badName).to.be.an('object');
        expect(badName).to.equal(stubBadName);
        done();

        return {
          method: function() {}
        };
      }];
      mockery.registerMock(path.join(Ravel.cwd, './test'), stubClientModule);
      mockery.registerMock('bad.name', stubBadName);
      Ravel.module('./test');
      Ravel._moduleFactories['test']();
    });

    it('should throw an ApplicationError.NotFound when a module factory which utilizes an unknown module/npm dependency is instantiated', function(done) {
      var stub = function(unknownModule) {
        expect(unknownModule).to.be.an('object');
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub);
      Ravel.module('./test');
      var shouldThrow = function() {
        Ravel._moduleFactories['test']();
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.NotFound);
      done();
    });

    it('should allow clients to register plain modules which are objects instead of factories, bypassing dependency injection', function(done) {
      var stub = {
        method: function(){}
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub);
      Ravel.module('./test');
      expect(Ravel._moduleFactories).to.not.have.property('test');
      expect(Ravel.modules.test).to.deep.equal(stub);
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a module factory which is neither a function nor an object', function(done) {
      var stub = 'I am not a function or an object';
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub);
      var shouldThrow = function() {
        Ravel.module('./test');
      };
      expect(shouldThrow).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should perform dependency injection on module factories which works regardless of the order of specified dependencies', function(done) {
      var momentStub = {};
      mockery.registerMock('moment', momentStub);
      var stub1 = function($E, moment) {
        expect($E).to.be.ok;
        expect($E).to.be.an('object');
        expect($E).to.equal(Ravel.ApplicationError);
        expect(moment).to.be.ok;
        expect(moment).to.be.an('object');
        expect(moment).to.equal(momentStub);
        return {};
      };
      var stub2 = function(moment, $E) {
        expect($E).to.be.ok;
        expect($E).to.be.an('object');
        expect($E).to.equal(Ravel.ApplicationError);
        expect(moment).to.be.ok;
        expect(moment).to.be.an('object');
        expect(moment).to.equal(momentStub);
        done();
        return {};
      };
      mockery.registerMock(path.join(Ravel.cwd, './test1'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, './test2'), stub2);
      Ravel.module('./test1');
      Ravel.module('./test2');
      Ravel._moduleFactories['test1']();
      Ravel._moduleFactories['test2']();
    });

    it('should inject the same instance of a module into all modules which reference it', function(done) {
      var stub1 = function() {
        return {
          method:function(){}
        };
      };
      var stub2Test;
      var stub2 = function(test) {
        expect(test).to.be.an('object');
        expect(test).to.have.a.property('method').that.is.a('function');
        stub2Test = test;
      };
      var stub3 = function(test) {
        expect(test).to.be.an('object');
        expect(test).to.have.a.property('method').that.is.a('function');
        expect(test).to.equal(stub2Test);
        done();
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, './test2'), stub2);
      mockery.registerMock(path.join(Ravel.cwd, './test3'), stub3);
      Ravel.module('./test');
      Ravel.module('./test2');
      Ravel.module('./test3');
      Ravel._moduleFactories['test']();
      Ravel._moduleFactories['test2']();
      Ravel._moduleFactories['test3']();
    });

    it('should preserve the scope of module factories in module instances', function(done) {
      var stub1 = function() {
        var outOfScope = 'hello';
        var instance = {
          goodbye: 'goodbye'
        };
        instance.method = function() {
          return outOfScope + ' ' + this.goodbye;
        };
        return instance;
      };
      var stub2 = function(test) {
        return {
          method: function() {
            expect(test.method()).to.equal('hello goodbye');
            done();
          }
        };
      };
      mockery.registerMock(path.join(Ravel.cwd, './test'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, './test2'), stub2);
      Ravel.module('./test');
      Ravel.module('./test2');
      Ravel._moduleFactories['test']();
      Ravel._moduleFactories['test2']();
      Ravel.modules.test2.method();
    });

  });
});
