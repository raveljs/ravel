'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var path = require('path');

var Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.disable();
    done();
  });

  describe('#module()', function() {
    it('should allow clients to register module files for instantiation in Ravel.start, and assign them a name', function(done) {
      Ravel.module('test', 'test');
      expect(Ravel._moduleFactories).to.have.property('test');
      expect(Ravel._moduleFactories['test']).to.be.a('function');
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple modules with the same name', function(done) {
      try {
        Ravel.module('test', 'test');
        Ravel.module('test', 'test2');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.DuplicateEntry);
        done();
      }
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
      Ravel.module('test', 'stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      Ravel._moduleFactories['test']();
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
      Ravel.module('test', 'stub1');
      Ravel.module('test2', 'stub2');
      mockery.registerMock(path.join(Ravel.cwd, 'stub1'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, 'stub2'), stub2);
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
      Ravel.module('test', 'stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel._moduleFactories['test']();
    });

    it('should throw an ApplicationError.NotFound when a module factory which utilizes an unknown module/npm dependency is instantiated', function(done) {
      var stub = function(unknownModule) {
        expect(unknownModule).to.be.an('object');
      };
      Ravel.module('test', 'stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      try {
        Ravel._moduleFactories['test']();
        done(new Error('It should be impossible to use a module factory which refers to an unknown module or npm dependency'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should allow clients to register plain modules which are objects instead of factories, bypassing dependency injection', function(done) {
      var stub = {
        method: function(){}
      };
      Ravel.module('test', 'stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      Ravel._moduleFactories['test']();
      expect(Ravel.modules.test).to.deep.equal(stub);
      done();
    });

    it('should throw an ApplicationError.IllegalValue when a client attempts to register a module factory which is neither a function nor an object', function(done) {
      var stub = 'I am not a function or an object';
      Ravel.module('test', 'stub');
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      try {
        Ravel._moduleFactories['test']();
        done(new Error('It should be impossible to register a module factory which is neither a function nor an object'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
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
      Ravel.module('test1', 'stub1');
      mockery.registerMock(path.join(Ravel.cwd, 'stub1'), stub1);
      Ravel.module('test2', 'stub2');
      mockery.registerMock(path.join(Ravel.cwd, 'stub2'), stub2);
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
      Ravel.module('test', 'stub1');
      Ravel.module('test2', 'stub2');
      Ravel.module('test3', 'stub3');
      mockery.registerMock(path.join(Ravel.cwd, 'stub1'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, 'stub2'), stub2);
      mockery.registerMock(path.join(Ravel.cwd, 'stub3'), stub3);
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
      Ravel.module('test', 'stub1');
      Ravel.module('test2', 'stub2');
      mockery.registerMock(path.join(Ravel.cwd, 'stub1'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, 'stub2'), stub2);
      Ravel._moduleFactories['test']();
      Ravel._moduleFactories['test2']();
      Ravel.modules.test2.method();
    });

  });
});
