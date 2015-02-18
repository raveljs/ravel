'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');
var httpMocks = require('node-mocks-http');

var Ravel, authorizeRequest, authorizeTokenStub, tokenToProfile;

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
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    authorizeRequest = undefined;
    authorizeTokenStub = undefined;
    mockery.disable();
    done();
  });

  describe('middleware', function() {
    it('should use passport\'s req.isAuthenticated() to check users by default, calling next() if users are authorized by passport', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      req.isAuthenticated = function() {
        return true;
      };
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var next = sinon.stub();
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.have.been.called;
      expect(next).to.have.been.calledWith();
      done();
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, sending HTTP 401 UNAUTHORIZED if users are unauthorized', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      req.isAuthenticated = function() {
        return false;
      };
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.have.been.called;
      expect(next).to.not.have.been.called;
      expect(res).to.have.property('statusCode').that.equals(401);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('should use passport\'s req.isAuthenticated() to check users by default, redirecting to the login page if users are unauthorized and redirects are enabled', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, true, false);
      Ravel.set('login route', '/login');
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      req.isAuthenticated = function() {
        return false;
      };
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var redirectSpy = sinon.spy(res, 'redirect');
      var next = sinon.stub();
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.have.been.called;
      expect(next).to.not.have.been.called;
      expect(redirectSpy).to.have.been.calledWith('/login');
      done();
    });

    it('should use x-auth-token and x-auth-client headers to authorize mobile clients', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      req.isAuthenticated = function() {};
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var next = sinon.stub();
      var profile = {}, user = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(null, profile);
      });
      Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(null, user);
      });
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.not.have.been.called;
      expect(next).to.have.been.calledWith();
      expect(req).to.have.property('user').that.equals(user);
      done();
    });

    it('should use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the user does not exist and registration is disabled', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      req.isAuthenticated = function() {};
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var profile = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(null, profile);
      });
      Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(new Ravel.ApplicationError.NotFound('User does not exist'), null);
      });
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.not.have.been.called;
      expect(next).to.not.have.been.called;
      expect(res).to.have.property('statusCode').that.equals(401);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, failing with HTTP 401 UNAUTHORIZED if the token cannot be validated or translated into a profile', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, false);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      req.isAuthenticated = function() {};
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(new Error(), null);
      });
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.not.have.been.called;
      expect(next).to.not.have.been.called;
      expect(res).to.have.property('statusCode').that.equals(401);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, registering users if that functionality is enabled and they don\'t already exist', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, true);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      req.isAuthenticated = function() {};
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var next = sinon.stub();
      var profile = {}, user = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(null, profile);
      });
      Ravel.set('get or create user function', function(Ravel, accessToken, refreshToken, profile, callback) {
        callback(null, user);
      });
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.not.have.been.called;
      expect(next).to.have.been.calledWith();
      expect(req).to.have.property('user').that.equals(user);
      done();
    });

    it('use x-auth-token and x-auth-client headers to authorize mobile clients, responding with HTTP 401 UNAUTHORIZED if user registration is enabled and registration fails', function(done) {
      authorizeRequest = require('../../lib-cov/auth/authorize_request')(Ravel, false, true);
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      req.isAuthenticated = function() {};
      var isAuthenticatedSpy = sinon.spy(req, 'isAuthenticated');
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var profile = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(null, profile);
      });
      Ravel.set('get or create user function', function(Ravel, accessToken, refreshToken, profile, callback) {
        callback(new Error(), null);
      });
      authorizeRequest(req, res, next);
      expect(isAuthenticatedSpy).to.not.have.been.called;
      expect(next).to.not.have.been.called;
      expect(res).to.have.property('statusCode').that.equals(401);
      expect(endSpy).to.have.been.called;
      done();
    });
  });
});
