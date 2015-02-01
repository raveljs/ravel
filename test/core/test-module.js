'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var path = require('path');

var Ravel;

describe('core/module', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    done();
  });

  describe('#Ravel.module', function() {
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
        expect($L).to.have.property('l').that.is.a('function');
        expect($L).to.have.property('i').that.is.a('function');
        expect($L).to.have.property('w').that.is.a('function');
        expect($L).to.have.property('e').that.is.a('function');
        expect($KV).to.be.ok;
        expect($KV).to.be.an('object');
        expect($KV).to.equal(Ravel.kvstore);
        done();

        return {
          method: function() {}
        }
      };
      Ravel.module('test', 'stub');
      mockery.enable({
        useCleanCache: true,
        warnOnReplace: false,
        warnOnUnregistered: false
      });
      mockery.registerMock(path.join(Ravel.cwd, 'stub'), stub);
      Ravel._moduleFactories['test']();
      mockery.disable();
    });
  });

  //TODO test DI in any order
  //TODO test DI including NPM dependencies
  //TODO test DI with missing dependencies
  //TODO test modules which aren't functions
});
