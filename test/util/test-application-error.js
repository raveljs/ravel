'use strict';

var chai = require('chai');
var expect = chai.expect;

var Ravel, httpCodes;

describe('util/application_error', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    httpCodes = require('../../lib-cov/util/http_codes');
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    done();
  });

  describe('Ravel.ApplicationError', function() {

    it('should provide .General', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('General')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.General('test');
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.INTERNAL_SERVER_ERROR);
        done();
    });

    it('should provide .Access', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('Access')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.Access('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.FORBIDDEN);
        done();
    });

    it('should provide .Authorization', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('Authorization')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.Authorization('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.UNAUTHORIZED);
        done();
    });

    it('should provide .DuplicateEntry', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('DuplicateEntry')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.DuplicateEntry('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.CONFLICT);
        done();
    });

    it('should provide .IllegalValue', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('IllegalValue')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.IllegalValue('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.BAD_REQUEST);
        done();
    });

    it('should provide .NotAllowed', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('NotAllowed')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.NotAllowed('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.METHOD_NOT_ALLOWED);
        done();
    });

    it('should provide .NotFound', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('NotFound')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.NotFound('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.NOT_FOUND);
        done();
    });

    it('should provide .NotImplemented', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('NotImplemented')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.NotImplemented('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.NOT_IMPLEMENTED);
        done();
    });

    it('should provide .RangeOutOfBounds', function(done) {
      expect(Ravel.ApplicationError).to.have.a.property('RangeOutOfBounds')
        .that.is.a('function');
      var err = new Ravel.ApplicationError.RangeOutOfBounds('test');
      expect(err).to.be.an.instanceof(Ravel.ApplicationError.General);
      expect(err).to.have.a.property('message').that.equals('test');
      expect(err).to.have.a.property('code').that.equals(httpCodes.REQUESTED_RANGE_NOT_SATISFIABLE);
        done();
    });

  });
});
