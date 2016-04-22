'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const koa = require('koa');
const request = require('supertest');
const upath = require('upath');

const AuthorizationProvider = (require('../../lib/ravel')).AuthorizationProvider;
class GoogleOAuth2 extends AuthorizationProvider {
  constructor() {
    super('google-oauth2');
  }
}

let Ravel, Module, app, authconfig, AuthorizationMiddleware, authorizeTokenStub, credentialToProfile, coreSymbols;

describe('util/authorize_request', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    credentialToProfile = {
      credentialToProfile: function(){}
    };
    authorizeTokenStub = function() {
      return credentialToProfile;
    };
    mockery.registerMock('./authorize_token', authorizeTokenStub);

    Ravel = new (require('../../lib/ravel'))();
    Module = (require('../../lib/ravel')).Module;
    authconfig = Module.authconfig;
    coreSymbols = require('../../lib/core/symbols');

    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();
    Ravel.set('authorization providers', [provider]);

    AuthorizationMiddleware  = require('../../lib/ravel').AuthorizationMiddleware;
    Ravel.Log.setLevel('NONE');
    app = koa();
    Ravel.kvstore = {}; // mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    authorizeTokenStub = undefined;
    credentialToProfile = undefined;
    app = undefined;
    authconfig = undefined;
    AuthorizationMiddleware = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('middleware', function() {

    it('should allow read-only access to important state information, mostly for use by subclasses', function(done) {
      const shouldRedirect = Math.random() < 0.5;
      const allowMobileRegistration = Math.random() < 0.5;
      const auth = new AuthorizationMiddleware(Ravel, shouldRedirect, allowMobileRegistration);
      expect(auth).to.have.a.property('ravelInstance').that.equals(Ravel);
      expect(auth).to.have.a.property('shouldRedirect').that.equals(shouldRedirect);
      expect(auth).to.have.a.property('allowMobileRegistration').that.equals(allowMobileRegistration);
      done();
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, yielding to next() if users are authorized by passport', function(done) {
      const isAuthenticatedStub = sinon.stub().returns(true);
      const finalStub = sinon.stub();

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*() {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .expect(function() {
        expect(isAuthenticatedStub).to.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, sending HTTP 401 UNAUTHORIZED if users are unauthorized', function(done) {
      const isAuthenticatedStub = sinon.stub().returns(false);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());

      request(app.callback())
      .get('/entity')
      .expect(function() {
        expect(isAuthenticatedStub).to.have.been.called;
      })
      .expect(401, done);
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, redirecting to the login page if users are unauthorized and redirects are enabled', function(done) {
      Ravel.set('login route', '/login');
      const isAuthenticatedStub = sinon.stub().returns(false);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, true, false)).middleware());

      request(app.callback())
      .get('/entity')
      .expect(function() {
        expect(isAuthenticatedStub).to.have.been.called;
      })
      .expect('Location', /\/login/)
      .expect(302, done);
    });

    it('should use x-auth-token and x-auth-client headers to authorize mobile clients', function(done) {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {id: 1}, user = {name: 'smcintyre'};
      sinon.stub(credentialToProfile, 'credentialToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        getUserById(userId) { // eslint-disable-line no-unused-vars
          return Promise.resolve(user);
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');
      Ravel[coreSymbols.moduleInit]();

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*() {
        expect(this).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('should use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the user does not exist and registration is disabled', function(done) {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {};
      sinon.stub(credentialToProfile, 'credentialToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });

      @authconfig
      class AuthConfig extends Module {
        getUserById(userId) { // eslint-disable-line no-unused-vars
          return Promise.reject(new Ravel.ApplicationError.NotFound('User does not exist'));
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');
      Ravel[coreSymbols.moduleInit]();

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*() {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the token cannot be validated or translated into a profile', function(done) {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      sinon.stub(credentialToProfile, 'credentialToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.reject(new Error());
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*() {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, registering users if that functionality is enabled and they don\'t already exist', function(done) {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {}, user = {};
      sinon.stub(credentialToProfile, 'credentialToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        getOrCreateUserByProfile(accessToken, refreshToken, prof) { // eslint-disable-line no-unused-vars
          return Promise.resolve(user);
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');
      Ravel[coreSymbols.moduleInit]();

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, true)).middleware());
      app.use(function*() {
        expect(this).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, responding with HTTP 401 UNAUTHORIZED if user registration is enabled and registration fails', function(done) {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {}, user = {};
      sinon.stub(credentialToProfile, 'credentialToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        getOrCreateUserByProfile(accessToken, refreshToken, prof) { // eslint-disable-line no-unused-vars
          return Promise.reject(new Ravel.ApplicationError.NotFound('User does not exist'));
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');
      Ravel[coreSymbols.moduleInit]();

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, true)).middleware());
      app.use(function*() {
        // this assertion would fail if this middleware ever ran. But it shouldn't run.
        expect(this).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });
  });
});
