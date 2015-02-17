'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));

var Ravel, provider;

describe('auth/authorization_provider', function() {
  beforeEach(function(done) {
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    provider = new Ravel.AuthorizationProvider('name');
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    provider = undefined;
    done();
  });

  describe('constructor', function() {
    it('should allow clients to implement an authorization provider which has a name and several methods', function(done) {
      provider = new Ravel.AuthorizationProvider('google-oauth2');
      expect(provider.name).to.equal('google-oauth2');
      expect(provider).to.have.property('init').that.is.a('function');
      expect(provider).to.have.property('handlesClient').that.is.a('function');
      expect(provider).to.have.property('tokenToProfile').that.is.a('function');
      done();
    });
  });

  describe('#init()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      try {
        provider.init();
        done(new Error('It should be impossible to call init() on the template authoriation provider.'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
        done();
      }
    });
  });

  describe('#handlesClient()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      try {
        provider.handlesClient();
        done(new Error('It should be impossible to call handlesClient() on the template authoriation provider.'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
        done();
      }
    });
  });

  describe('#tokenToProfile()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      try {
        provider.tokenToProfile();
        done(new Error('It should be impossible to call tokenToProfile() on the template authoriation provider.'));
      } catch(err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
        done();
      }
    });
  });
});
