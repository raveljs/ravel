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

let Ravel, app, AuthorizationMiddleware, authorizeTokenStub, tokenToProfile;

describe('util/authorize_request', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    tokenToProfile = {
      tokenToProfile: function(){}
    };
    authorizeTokenStub = function() {
      return tokenToProfile;
    };
    mockery.registerMock('./authorize_token', authorizeTokenStub);

    Ravel = new (require('../../lib/ravel'))();

    //TODO remove when passport_init is included in ravel-next
    Ravel.registerSimpleParameter('login route', false);
    Ravel.registerSimpleParameter('get user function', false);
    Ravel.registerSimpleParameter('get or create user function', false);

    AuthorizationMiddleware  = require('../../lib/ravel').AuthorizationMiddleware;
    Ravel.Log.setLevel('NONE');
    app = koa();
    Ravel.kvstore = {}; // mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    authorizeTokenStub = undefined;
    tokenToProfile = undefined;
    app = undefined;
    AuthorizationMiddleware = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('middleware', function() {
    it('should use passport\'s req.isAuthenticated() to check users by default, calling next() if users are authorized by passport', function(done) {
      const isAuthenticatedStub = sinon.stub().returns(true);

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

      const profile = {}, user = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      Ravel.set('get user function', function(ravelInstance, profile2) { // eslint-disable-line no-unused-vars
        return Promise.resolve(user);
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*(next) {
        expect(this).to.have.property('user').that.equals(user);
        yield next;
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
      })
      .end(done);
    });

    it('should use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the user does not exist and registration is disabled', function(done) {
      const isAuthenticatedStub = sinon.stub();

      const profile = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      Ravel.set('get user function', function(ravelInstance, profile2) { // eslint-disable-line no-unused-vars
        return Promise.reject(new Ravel.ApplicationError.NotFound('User does not exist'));
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*(next) {
        yield next;
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the token cannot be validated or translated into a profile', function(done) {
      const isAuthenticatedStub = sinon.stub();

      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.reject(new Error());
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, false)).middleware());
      app.use(function*(next) {
        yield next;
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
      })
      .expect(401, done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, registering users if that functionality is enabled and they don\'t already exist', function(done) {
      const isAuthenticatedStub = sinon.stub();

      const profile = {}, user = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      Ravel.set('get or create user function', function() {
        return Promise.resolve(user);
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, true)).middleware());
      app.use(function*(next) {
        expect(this).to.have.property('user').that.equals(user);
        yield next;
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
      })
      .end(done);
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, responding with HTTP 401 UNAUTHORIZED if user registration is enabled and registration fails', function(done) {
      const isAuthenticatedStub = sinon.stub();

      const profile = {}, user = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        return Promise.resolve(profile);
      });
      Ravel.set('get or create user function', function() {
        return Promise.reject(new Error());
      });

      app.use(function*(next) {
        this.isAuthenticated = isAuthenticatedStub;
        yield next;
      });
      app.use((new AuthorizationMiddleware(Ravel, false, true)).middleware());
      app.use(function*(next) {
        // this assertion would fail if this middleware ever ran. But it shouldn't run.
        expect(this).to.have.property('user').that.equals(user);
        yield next;
      });

      request(app.callback())
      .get('/entity')
      .set('x-auth-token', 'oauth-token')
      .set('x-auth-client', 'test-ios')
      .expect(function() {
        expect(isAuthenticatedStub).to.not.have.been.called;
      })
      .expect(401, done);
    });
  });
});
