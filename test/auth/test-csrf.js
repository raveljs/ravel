'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');
var httpMocks = require('node-mocks-http');

var Ravel, csurfSpy, csrf, authorizeTokenStub, tokenToProfile;

describe('util/csrf', function() {
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
    csurfSpy = sinon.stub();
    mockery.registerMock('./authorize_token', authorizeTokenStub);
    mockery.registerMock('csurf', function() {
      return csurfSpy;
    });
    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    csrf = undefined;
    authorizeTokenStub = undefined;
    csurfSpy = undefined;
    tokenToProfile = undefined;
    mockery.disable();
    done();
  });

  describe('middleware', function() {
    it('should pass csrf validation on to csurf if client is a web client', function(done) {
      csrf = require('../../lib-cov/auth/csrf')(Ravel, {});
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      var res = httpMocks.createResponse();
      var next = sinon.stub();
      csrf(req, res, next);
      expect(csurfSpy).to.have.been.called;
      done();
    });

    it('should respond with HTTP 403 FORBIDDEN and a message if user\'s csrf token is invalid', function(done) {
      csurfSpy = sinon.stub().throws();
      csrf = require('../../lib-cov/auth/csrf')(Ravel, {});
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      var res = httpMocks.createResponse();
      var sendSpy = sinon.spy(res, 'send');
      var next = sinon.stub();
      csrf(req, res, next);
      expect(res).to.have.property('statusCode').that.equals(403);
      expect(sendSpy).to.have.been.called;
      done();
    });

    it('should allow clients to use x-auth-token and x-auth-client to bypass csrf protection if they have a valid token', function(done) {
      csrf = require('../../lib-cov/auth/csrf')(Ravel, {});
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      var res = httpMocks.createResponse();
      var profile = {};
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        expect(token).to.equal('oauth-token');
        expect(client).to.equal('test-ios');
        callback(null, profile);
      });
      var next = sinon.stub();
      csrf(req, res, next);
      expect(next).to.have.been.called;
      done();
    });

    it('should prevent clients from using x-auth-token and x-auth-client to bypass csrf protection if their tokens are invalid', function(done) {
      csrf = require('../../lib-cov/auth/csrf')(Ravel, {});
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      var res = httpMocks.createResponse();
      var error = new Error();
      sinon.stub(tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(error, null);
      });
      var next = sinon.stub();
      csrf(req, res, next);
      expect(next).to.have.been.calledWith(error);
      done();
    });
  });
});
