'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');

var Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#set()', function() {
    it('should allow clients to set the value of a parameter', function(done) {
      Ravel.registerSimpleParameter('test param', false);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it ('should throw a Ravel.ApplicationError.IllegalValue error when a client attempts to set an unknown parameter', function(done) {
      try {
        Ravel.set('unknown param', 'test value');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });
  });

  describe('#get()', function() {
    it('should allow clients to retrieve the value of a set optional parameter', function(done) {
      Ravel.registerSimpleParameter('test param', false);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should return undefined when clients attempt to retrieve the value of an unset optional parameter', function(done) {
      Ravel.registerSimpleParameter('test param', false);
      expect(Ravel.get('test param')).to.equal(undefined);
      done();
    });

    it('should allow clients to retrieve the value of a set required parameter', function(done) {
      Ravel.registerSimpleParameter('test param', true);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve an unregistered parameter', function(done) {
      try {
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve the value of an unset required parameter', function(done) {
      try {
        Ravel.registerSimpleParameter('test param', true);
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });
  });
});
