'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, provider;

describe('auth/authentication_provider', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    //mock Ravel.kvstore, since we're not actually starting Ravel.
    const redisMock = {
      createClient: function() {
        const redisClientStub = new (require('events').EventEmitter)(); //eslint-disable-line no-extra-parens
        redisClientStub.auth = function(){};
        return redisClientStub;
      },
    };
    mockery.registerMock('redis', redisMock);

    Ravel = new (require('../../lib/ravel'))();
    Ravel.log.setLevel('NONE');
    class TestProvider extends (require('../../lib/ravel')).AuthenticationProvider {
      get name() {
        return 'test';
      }
    }
    provider = new TestProvider(Ravel);
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    provider = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('constructor', function() {
    it('should allow clients to implement an authentication provider which has a name and several methods', function(done) {
      class GoogleOAuth2 extends (require('../../lib/ravel')).AuthenticationProvider {
        get name() {
          return 'google-oauth2';
        }
      }
      provider = new GoogleOAuth2(Ravel);
      expect(provider.name).to.equal('google-oauth2');
      expect(provider).to.have.property('init').that.is.a('function');
      expect(provider).to.have.property('handlesClient').that.is.a('function');
      expect(provider).to.have.property('credentialToProfile').that.is.a('function');
      expect(provider).to.have.property('log').that.is.an('object');
      expect(provider).to.have.property('ravelInstance').that.is.an('object');
      expect(provider).to.have.property('ApplicationError').that.is.an('object');
      done();
    });

    it('should require clients to supply a name for the provider', function(done) {
      expect(function() {
        new (require('../../lib/ravel')).AuthenticationProvider(Ravel); //eslint-disable-line no-new
      }).to.throw(Ravel.ApplicationError.NotImplemented);
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

  describe('#credentialToProfile()', function() {
    it('should throw Ravel.ApplicationError.NotImplemented, since this is a template', function(done) {
      expect(provider.credentialToProfile()).to.eventually.be.rejectedWith(Ravel.ApplicationError.NotImplemented);
      done();
    });
  });

  describe('Ravel.authorizationProviders', function() {
    it('should return an empty Array if no AuthorizationProviders are registered', function(done) {
      Ravel = new (require('../../lib/ravel'))();
      Ravel.log.setLevel('NONE');
      expect(Ravel.authenticationProviders).to.be.a('function');
      expect(Ravel.authenticationProviders()).to.be.an('array');
      expect(Ravel.authenticationProviders().length).to.equal(0);
      done();
    });

    it('should return an Array of registered AuthorizationProviders', function(done) {
      class GoogleOAuth2 extends (require('../../lib/ravel')).AuthenticationProvider {
        get name() {
          return 'google-oauth2';
        }
      }
      provider = new GoogleOAuth2(Ravel);
      expect(Ravel.authenticationProviders).to.be.a('function');
      expect(Ravel.authenticationProviders()).to.be.an('array');
      expect(Ravel.authenticationProviders().length).to.equal(2);
      expect(Ravel.authenticationProviders()[1]).to.equal(provider);
      done();
    });

    it('should require clients to supply a name for the provider', function(done) {
      expect(function() {
        new (require('../../lib/ravel')).AuthenticationProvider(Ravel); //eslint-disable-line no-new
      }).to.throw(Ravel.ApplicationError.NotImplemented);
      done();
    });
  });
});
