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

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('._injector#inject()', function() {
    it('should facilitate dependency injection of client modules into other client modules', function(done) {
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
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub1);
      mockery.registerMock(path.join(Ravel.cwd, 'test2'), stub2);
      Ravel.module('test');
      Ravel.module('test2');
      Ravel._moduleFactories['test']();
      Ravel._injector.inject({}, stub2);
    });

    it('should facilitate dependency injection of npm modules into client modules', function(done) {
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
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stubClientModule);
      mockery.registerMock('moment', stubMoment);
      Ravel.module('test');
      Ravel._injector.inject({}, stubClientModule);
    });

    it('should throw an ApplicationError.NotFound when attempting to inject an unknown module/npm dependency', function(done) {
      var stub = function(unknownModule) {
        expect(unknownModule).to.be.an('object');
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel.module('test');
      try {
        Ravel._injector.inject({}, stub);
        done(new Error('It should be impossible to inject an unknown module or npm dependency'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should support a module map which allows different Ravel services to make pseudo-modules available for injection. One of these, $E, is always available.', function(done) {
      var moduleMap = {
        pseudoModule: {}
      };
      var stub = function($E, pseudoModule) {
        expect($E).to.equal(Ravel.ApplicationError);
        expect(pseudoModule).to.equal(moduleMap.pseudoModule);
        done();
      };
      mockery.registerMock(path.join(Ravel.cwd, 'test'), stub);
      Ravel.module('test');
      Ravel._injector.inject(moduleMap, stub);
    });

    it('should support array notation for declaring dependencies which are not valid js variable names', function(done) {
      var stubBadName = {
        method: function() {}
      };
      var stubClientInstance = {
        method:function(){}
      };
      var stubClientModule = function() {
        return stubClientInstance;
      };
      var anotherStubClientModule = ['bad.module', 'myModule', function(bad, myModule) {
        expect(bad).to.be.ok;
        expect(bad).to.be.an('object');
        expect(bad).to.equal(stubBadName);
        expect(myModule).to.be.ok;
        expect(myModule).to.be.an('object');
        expect(myModule).to.deep.equal(stubClientInstance);
        done();

        return {
          method: function() {}
        };
      }];
      mockery.registerMock(path.join(Ravel.cwd, 'my-module.js'), stubClientModule);
      mockery.registerMock(path.join(Ravel.cwd, 'test'), anotherStubClientModule);
      mockery.registerMock('bad.module', stubBadName);
      Ravel.module('my-module.js');
      Ravel.module('test');
      Ravel._moduleFactories['myModule']();
      Ravel._injector.inject({}, anotherStubClientModule);
    });
  });
});
