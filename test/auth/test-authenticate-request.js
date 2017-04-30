'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const Koa = require('koa');
const request = require('supertest');
const upath = require('upath');

const AuthenticationProvider = require('../../lib/ravel').AuthenticationProvider;
class GoogleOAuth2 extends AuthenticationProvider {
  get name () {
    return 'google-oauth2';
  }
}

let Ravel, Module, app, authconfig, AuthenticationMiddleware,
  authenticateTokenStub, credentialToProfile, coreSymbols, restMiddleware;

describe('util/authenticate_request', function () {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    credentialToProfile = {
      credentialToProfile: function () {}
    };
    authenticateTokenStub = function () {
      return credentialToProfile;
    };
    mockery.registerMock('./authenticate_token', authenticateTokenStub);

    Ravel = new (require('../../lib/ravel'))();
    Module = (require('../../lib/ravel')).Module;
    authconfig = Module.authconfig;
    coreSymbols = require('../../lib/core/symbols');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    AuthenticationMiddleware = require('../../lib/auth/authenticate_request');
    const Rest = require('../../lib/util/rest');
    restMiddleware = (new Rest(Ravel)).errorHandler();
    Ravel.log.setLevel('NONE');
    app = new Koa();
    Ravel.kvstore = {}; // mock Ravel.kvstore, since we're not actually starting Ravel.
    Ravel[coreSymbols.parametersLoaded] = true;
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    authenticateTokenStub = undefined;
    credentialToProfile = undefined;
    app = undefined;
    authconfig = undefined;
    AuthenticationMiddleware = undefined;
    restMiddleware = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('middleware', function () {
    it('should allow read-only access to important state information, mostly for use by subclasses', (done) => {
      const shouldRedirect = Math.random() < 0.5;
      const allowMobileRegistration = Math.random() < 0.5;
      const auth = new AuthenticationMiddleware(Ravel, shouldRedirect, allowMobileRegistration);
      expect(auth).to.have.a.property('ravelInstance').that.equals(Ravel);
      expect(auth).to.have.a.property('shouldRedirect').that.equals(shouldRedirect);
      expect(auth).to.have.a.property('allowMobileRegistration').that.equals(allowMobileRegistration);
      done();
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, awaiting next() if users are authenticated by passport', (done) => {
      const isAuthenticatedStub = sinon.stub().returns(true);
      const finalStub = sinon.stub();

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());
      app.use(function () {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .expect(function () {
        expect(isAuthenticatedStub).to.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, sending HTTP 401 UNAUTHORIZED if users are unauthenticated', (done) => {
      const isAuthenticatedStub = sinon.stub().returns(false);

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());

      request(app.callback())
      .get('/entity')
      .expect(function () {
        expect(isAuthenticatedStub).to.have.been.called;
      })
      .expect(401, done);
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, redirecting to the login page if users are unauthenticated and redirects are enabled', (done) => {
      Ravel.set('login route', '/login');
      const isAuthenticatedStub = sinon.stub().returns(false);

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, true, false)).middleware());

      request(app.callback())
      .get('/entity')
      .expect(function () {
        expect(isAuthenticatedStub).to.have.been.called;
      })
      .expect('Location', /\/login/)
      .expect(302, done);
    });

    it('should use x-auth-token and x-auth-client headers to authenticate mobile clients', (done) => {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {id: 1};
      const user = {name: 'smcintyre'};
      sinon.stub(credentialToProfile, 'credentialToProfile').callsFake(function (token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        deserializeUser (userId) { // eslint-disable-line no-unused-vars
          return Promise.resolve(user);
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);
      Ravel[coreSymbols.moduleInit]();
      Ravel.emit('post module init');

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());
      app.use(async function (ctx) {
        expect(ctx).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function () {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('should use x-auth-token and x-auth-client headers to authenticate mobile clients, failing with HTTP 401 UNAUTHORIZED if the user does not exist and registration is disabled', (done) => {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {};
      sinon.stub(credentialToProfile, 'credentialToProfile').callsFake(function (token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });

      @authconfig
      class AuthConfig extends Module {
        deserializeUser (userId) { // eslint-disable-line no-unused-vars
          return Promise.reject(new Ravel.ApplicationError.NotFound('User does not exist'));
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);
      Ravel[coreSymbols.moduleInit]();
      Ravel.emit('post module init');

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());
      app.use(async function () {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function () {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authenticate mobile clients, failing with HTTP 401 UNAUTHORIZED if the token cannot be validated or translated into a profile', (done) => {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      sinon.stub(credentialToProfile, 'credentialToProfile').callsFake(function (token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.reject(new Error());
      });

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());
      app.use(function () {
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function () {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authenticate mobile clients, registering users if that functionality is enabled and they don\'t already exist', (done) => {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {};
      const user = {};
      sinon.stub(credentialToProfile, 'credentialToProfile').callsFake(function (token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        deserializeOrCreateUser (accessToken, refreshToken, prof) { // eslint-disable-line no-unused-vars
          return Promise.resolve(user);
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);
      Ravel[coreSymbols.moduleInit]();
      Ravel.emit('post module init');

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, true)).middleware());
      app.use(async function (ctx) {
        expect(ctx).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function () {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.have.been.called;
      })
      .end(done);
    });

    it('use x-auth-token and x-auth-client headers to authenticate mobile clients, responding with HTTP 401 UNAUTHORIZED if user registration is enabled and registration fails', (done) => {
      const isAuthenticatedStub = sinon.stub();
      const finalStub = sinon.stub();

      const profile = {};
      const user = {};
      sinon.stub(credentialToProfile, 'credentialToProfile').callsFake(function (token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      @authconfig
      class AuthConfig extends Module {
        deserializeOrCreateUser (accessToken, refreshToken, prof) { // eslint-disable-line no-unused-vars
          return Promise.reject(new Ravel.ApplicationError.NotFound('User does not exist'));
        }
      }
      mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
      Ravel.module('authconfig', 'authconfig');

      require('../../lib/auth/passport_init')(Ravel);
      Ravel.emit('post config koa', app);
      Ravel[coreSymbols.moduleInit]();
      Ravel.emit('post module init');

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        await next();
      });
      app.use((new AuthenticationMiddleware(Ravel, false, true)).middleware());
      app.use(async function (ctx) {
        // this assertion would fail if this middleware ever ran. But it shouldn't run.
        expect(ctx).to.have.property('user').that.equals(user);
        finalStub();
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function () {
        expect(isAuthenticatedStub).to.not.have.been.called;
        expect(finalStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('should rethrow errors which are not related to auth', (done) => {
      const isAuthenticatedStub = sinon.stub().returns(true);
      const error = new Error('something went wrong');

      app.use(restMiddleware);
      app.use(async function (ctx, next) {
        ctx.isAuthenticated = isAuthenticatedStub;
        try {
          await next();
          ctx.status = 200;
        } catch (err) {
          expect(err).to.equal(error);
          ctx.body = 'something went wrong';
          ctx.status = 500;
        }
      });
      app.use((new AuthenticationMiddleware(Ravel, false, false)).middleware());
      app.use(async function () {
        throw error;
      });
      request(app.callback())
      .get('/entity')
      .expect(async function () {
        expect(isAuthenticatedStub).to.have.been.called;
      })
      .expect(500, 'something went wrong', done);
    });
  });
});
