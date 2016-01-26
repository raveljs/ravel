'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const httpMocks = require('node-mocks-http');

let Mocks;

describe('ws/authorize', function() {
  beforeEach(function(done) {    
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    require('./before-each')(mockery, function(M) {
      Mocks = M;
      done();
    });
  });

  afterEach(function(done) {
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('primus.authorize', function() {
    it('should create a primus authorization function which authorizes users who have a valid express/passport session', function(done) {
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      const session = {
        passport: {
          user: 1
        }
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, session);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.null;
          expect(user).to.equal(session.passport.user);
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });

    it('should create a primus authorization function which rejects users who have an unauthorized express/passport session', function(done) {
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      const session = {
        //unauthorized
      };
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(null, session);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });

    it('should create a primus authorization function which rejects users when it cannot retrieve their session', function(done) {
      Mocks.cookieParser = function(req, o, callback) {
        req.signedCookies = {'connect.sid':9999999};
        callback();
      };
      const error = new Error();
      sinon.stub(Mocks.expressSessionStore, 'get', function(sessionId, callback) {
        callback(error, null);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.equal(error);
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });

    it('should create a primus authorization function which authorizes users who have valid x-auth-token and x-auth-client headers', function(done) {
      const profile = {
        id: 1,
        name: 'Sean McIntyre'
      };
      sinon.stub(Mocks.tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(null, profile);
      });
      Mocks.Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(null, profile);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.null;
          expect(user).to.equal(1);
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });

    it('should create a primus authorization function which rejects users who have invalid x-auth-token and x-auth-client headers', function(done) {
      sinon.stub(Mocks.tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(new Error(), null);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.not.null;
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });

    it('should create a primus authorization function which rejects users who have valid x-auth-token and x-auth-client headers, but aren\'t registered users', function(done) {
      const profile = {
        id: 1,
        name: 'Sean McIntyre'
      };
      sinon.stub(Mocks.tokenToProfile, 'tokenToProfile', function(token, client, callback) {
        callback(null, profile);
      });
      Mocks.Ravel.set('get user function', function(Ravel, profile, callback) {
        callback(new Mocks.Ravel.ApplicationError.NotFound('User does not exist'), null);
      });
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/primus',
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'x-auth-token': 'oauth-token',
          'x-auth-client': 'test-ios'
        }
      });
      Mocks.primus.authorize = function(authFunction) {
        expect(authFunction).to.be.a('function');
        authFunction(req, function(err, user) {
          expect(err).to.be.not.null;
          expect(user).to.be.not.ok;
          done();
        });
      };

      require('../../lib/ws/primus_init')(
        Mocks.Ravel, Mocks.Ravel._injector, Mocks.primus, Mocks.expressSessionStore, Mocks.roomResolver);
    });
  });
});
