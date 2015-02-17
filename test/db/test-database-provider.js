'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));

var Ravel, provider;

describe('db/database_provider', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    provider = new Ravel.DatabaseProvider('name');
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    provider = undefined;
    done();
  });

  describe('constructor', function() {
    it('should allow clients to implement a database provider which has a name and several methods', function(done) {
      provider = new Ravel.DatabaseProvider('mysql');
      expect(provider.name).to.equal('mysql');
      expect(provider).to.have.property('getTransactionConnection').that.is.a('function');
      expect(provider).to.have.property('exitTransaction').that.is.a('function');
      done();
    });
  });

  describe('#getTransactionConnection()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      try {
        provider.getTransactionConnection();
        done(new Error('It should be impossible to call getTransactionConnection() on the template database provider.'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
        done();
      }
    });
  });

  describe('#exitTransaction()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      try {
        provider.exitTransaction();
        done(new Error('It should be impossible to call exitTransaction() on the template database provider.'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
        done();
      }
    });
  });
});
