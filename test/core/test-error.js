'use strict';

var chai = require('chai');
var expect = chai.expect;

var Ravel;
var httpCodes = require('../../lib/util/http_codes');

describe('Ravel', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    delete Ravel.ApplicationError.Teapot;
    Ravel = undefined;
    done();
  });

  describe('#error()', function() {
    it('should allow clients to register new error types, along with a matching HTTP status code', function(done) {
      Ravel.error('Teapot', httpCodes.IM_A_TEAPOT);
      expect(Ravel.ApplicationError.Teapot).to.be.a('function');
      var err = new Ravel.ApplicationError.Teapot();
      expect(err).to.be.instanceOf(Ravel.ApplicationError.General);
      expect(err).to.have.property('code').that.equals(httpCodes.IM_A_TEAPOT);
      done();
    });

    it('should throw a Ravel.ApplicationError.DuplicateEntry if an error type with the given name already exists', function(done) {
      var test = function() {
        Ravel.error('Access', httpCodes.IM_A_TEAPOT);
      };
      expect(test).to.throw(Ravel.ApplicationError.DuplicateEntry);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if a non-string name is supplied', function(done) {
      var test = function() {
        Ravel.error({}, httpCodes.IM_A_TEAPOT);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if a null/undefined name is supplied', function(done) {
      var test = function() {
        Ravel.error(null, httpCodes.IM_A_TEAPOT);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if a null/undefined status code is supplied', function(done) {
      var test = function() {
        Ravel.error('Teapot', undefined);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if a non-number status code is supplied', function(done) {
      var test = function() {
        Ravel.error('Teapot', {});
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if an illegal status code is supplied', function(done) {
      var test = function() {
        Ravel.error('Teapot', -20);
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });
  });
});
