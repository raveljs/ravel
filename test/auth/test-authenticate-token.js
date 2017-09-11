'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const sinon = require('sinon');

let Ravel, tokenAuth, profile, testProvider, coreSymbols;

describe('auth/authenticate_token', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    // mock Ravel.kvstore, since we're not actually starting Ravel.
    const redisMock = {
      createClient: () => {
        const redisClientStub = new (require('events').EventEmitter)(); // eslint-disable-line no-extra-parens
        redisClientStub.auth = function () {};
        redisClientStub.get = function () {};
        redisClientStub.setex = function () {};
        return redisClientStub;
      }
    };
    mockery.registerMock('redis', redisMock);

    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel(Ravel.log.NONE);
    Ravel.set('redis port', 0);
    Ravel.set('redis host', 'localhost');
    Ravel.set('redis password', 'password');
    Ravel.set('redis keepalive interval', 1000);
    Ravel[coreSymbols.parametersLoaded] = true;
    Ravel.kvstore = require('../../lib/util/kvstore')(Ravel);

    tokenAuth = new (require('../../lib/auth/authenticate_token'))(Ravel);

    // mock up an authentication provider for our tests
    profile = {};

    const AuthenticationProvider = require('../../lib/ravel').AuthenticationProvider;

    class TestProvider extends AuthenticationProvider {
      get name () {
        return 'test';
      }

      init () {

      }

      handlesClient (client) {
        return client === 'test-web';
      }

      credentialToProfile (credential, client) { // eslint-disable-line no-unused-vars
        return Promise.resolve({profile: profile, expiry: 2000});
      }
    }
    testProvider = new TestProvider(Ravel);
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    coreSymbols = undefined;
    tokenAuth = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#credentialToProfile()', () => {
    it('should use the appropriate authentication provider to validate and turn a client token into a profile', (done) => {
      sinon.stub(Ravel.kvstore, 'get').callsFake(function (key, callback) {
        callback(null, undefined);
      });
      sinon.stub(Ravel.kvstore, 'setex');
      expect(tokenAuth.credentialToProfile('oauth-token', 'test-web')).to.eventually.equal(profile);
      done();
    });

    it('should throw a Ravel.ApplicationError.NotFound error if there is no provider for the given client type', (done) => {
      expect(tokenAuth.credentialToProfile('oauth-token', 'test-ios')).to.eventually.be.rejectedWith(Ravel.ApplicationError.NotFound);
      done();
    });

    it('should cache profiles in redis using an expiry time which matches the token expiry time', (done) => {
      sinon.stub(Ravel.kvstore, 'get').callsFake(function (key, callback) {
        callback(null, undefined);
      });
      const spy = sinon.stub(Ravel.kvstore, 'setex');
      const promise = tokenAuth.credentialToProfile('oauth-token', 'test-web');
      expect(promise).to.eventually.deep.equal(profile);
      promise.then(() => {
        expect(spy).to.have.been.calledWith(testProvider.name + '-test-web-profile-oauth-token', 2000, JSON.stringify(profile));
        done();
      });
    });

    it('should satisfy profile translates from redis when possible', (done) => {
      sinon.stub(Ravel.kvstore, 'get').callsFake(function (key, callback) {
        callback(null, JSON.stringify(profile));
      });
      const setexSpy = sinon.stub(Ravel.kvstore, 'setex');
      const translateSpy = sinon.spy(testProvider, 'credentialToProfile');
      const promise = tokenAuth.credentialToProfile('oauth-token', 'test-web');
      expect(promise).to.eventually.deep.equal(profile);
      promise.then(() => {
        expect(setexSpy).to.not.have.been.called;
        expect(translateSpy).to.not.have.been.called;
        done();
      });
    });

    it('should callback with an error if anything goes wrong while translating the token into a profile, such an encountering an invalid token', (done) => {
      sinon.stub(Ravel.kvstore, 'get').callsFake(function (key, callback) {
        callback(null, undefined);
      });
      const spy = sinon.stub(Ravel.kvstore, 'setex');
      sinon.stub(testProvider, 'credentialToProfile').callsFake(function (token, client) { // eslint-disable-line no-unused-vars
        return Promise.reject(new Error());
      });
      const promise = tokenAuth.credentialToProfile('oauth-token', 'test-web');
      expect(promise).to.eventually.be.rejectedWith(Error);
      promise.catch(() => {
        expect(spy).to.not.have.been.called;
        done();
      });
    });
  });
});
