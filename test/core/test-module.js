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

    it('the module factory created when registering a module should be able to require the module and inject $MethodBuilder into it', function(done) {
      var stub = function($MethodBuilder) {
        expect($MethodBuilder).to.be.ok;
        expect($MethodBuilder).to.be.an('object');
        expect($MethodBuilder).to.have.property('add');
        expect($MethodBuilder['add']).to.be.a('function');
        done();
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
});
