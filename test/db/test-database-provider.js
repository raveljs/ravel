'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, DatabaseProvider, provider;

describe('db/database_provider', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    DatabaseProvider = require('../../lib/ravel').DatabaseProvider;
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    provider = new DatabaseProvider('name');
    done();
  });

  afterEach(function(done) {
    DatabaseProvider = undefined;
    Ravel = undefined;
    provider = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('constructor', function() {
    it('should allow clients to implement a database provider which has a name and several methods', function(done) {
      provider = new DatabaseProvider('mysql');
      expect(provider.name).to.equal('mysql');
      expect(provider).to.have.property('getTransactionConnection').that.is.a('function');
      expect(provider).to.have.property('exitTransaction').that.is.a('function');
      done();
    });
  });

  describe('_init', function() {
    it('should provide a DatabaseProvider with a logger for use in its methods', function(done) {
      Ravel.set('database providers', [provider]);
      Ravel._databaseProviderInit();
      expect(provider.log).to.be.ok;
      expect(provider.log).to.be.an('object');
      expect(provider.log).to.have.property('trace').that.is.a('function');
      expect(provider.log).to.have.property('verbose').that.is.a('function');
      expect(provider.log).to.have.property('debug').that.is.a('function');
      expect(provider.log).to.have.property('info').that.is.a('function');
      expect(provider.log).to.have.property('warn').that.is.a('function');
      expect(provider.log).to.have.property('error').that.is.a('function');
      expect(provider.log).to.have.property('critical').that.is.a('function');
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
