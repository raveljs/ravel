'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var sinon = require('sinon');
var express = require('express');

var Ravel, passportMock;

describe('auth/passport_init', function() {
  beforeEach(function(done) {
    passportMock = {
      initialize: function() {
        return function(req, res, next) {
          next();
        };
      },
      session: function() {
        return function(req, res, next) {
          next();
        };
      },
      serializeUser: function() {},
      deserializeUser: function() {},
    };

    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    mockery.registerMock('passport', passportMock);

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    passportMock = undefined;
    mockery.disable();
    done();
  });

  it('should ensure that any attempt to use the \'get user function\' when it is not defined results in a Ravel.ApplicationError.NotImplemented', function(done) {
    try {
      Ravel.get('get user function')();
      done(new Error('any attempt to use the \'get user function\' when it is not defined results in a Ravel.ApplicationError.NotImplemented'));
    } catch (err) {
      expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
      done();
    }
  });

  it('should ensure that any attempt to use the \'get or create user function\' when it is not defined results in a Ravel.ApplicationError.NotImplemented', function(done) {
    try {
      Ravel.get('get or create user function')();
      done(new Error('any attempt to use the \'get user function\' when it is not defined results in a Ravel.ApplicationError.NotImplemented'));
    } catch (err) {
      expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
      done();
    }
  });

  it('should not initialize passport and replace $Private and $PrivateRedirect with stubs that throw Ravel.ApplicationError.NotImplemented if no authorization providers are registered', function(done) {
    var app = express();
    var useSpy = sinon.spy(app, 'use');
    var passportInitSpy = sinon.spy(passportMock, 'initialize');
    var passportSessionSpy = sinon.spy(passportMock, 'session');

    Ravel.emit('post config express', app);
    expect(useSpy).to.not.have.been.called;
    expect(passportInitSpy).to.not.have.been.called;
    expect(passportSessionSpy).to.not.have.been.called;
    expect(Ravel.authorize).to.be.a('function');
    expect(Ravel.authorizeWithRedirect).to.be.a('function');
    try {
      Ravel.authorize();
      done(new Error('$Private should throw a Ravel.ApplicationError.NotImplemented in the absence of an authorization provider.'));
    } catch (err) {
      expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
    }
    try {
      Ravel.authorizeWithRedirect();
      done(new Error('$Private should throw a Ravel.ApplicationError.NotImplemented in the absence of an authorization provider.'));
    } catch (err) {
      expect(err).to.be.instanceof(Ravel.ApplicationError.NotImplemented);
      done();
    }
  });

  it('should initialize passport and sessions for express', function(done) {
    var initStub = sinon.stub();
    Ravel.set('authorization providers', [{
      init: initStub
    }]);
    var app = express();
    var useSpy = sinon.spy(app, 'use');
    var passportInitSpy = sinon.spy(passportMock, 'initialize');
    var passportSessionSpy = sinon.spy(passportMock, 'session');

    Ravel.emit('post config express', app);
    expect(useSpy).to.have.been.called;
    expect(passportInitSpy).to.have.been.called;
    expect(passportSessionSpy).to.have.been.called;
    expect(initStub).to.have.been.calledWith(app, passportMock);
    done();
  });

  it('should use user.id to serialize users to a session cookie', function(done) {
    Ravel.set('authorization providers', [{
      init: sinon.stub()
    }]);
    var app = express();

    sinon.stub(passportMock, 'serializeUser', function(serializerFn) {
      serializerFn({id:9876}, function(err, result) {
        expect(result).to.equal(9876);
        done();
      });
    });

    Ravel.emit('post config express', app);
  });

  it('should use user.id to deserialize users from session cookies', function(done) {
    Ravel.set('authorization providers', [{
      init: sinon.stub()
    }]);
    Ravel.db = {
      scoped: function(){}
    };
    var profile = {
      id: 9876
    };
    Ravel.set('get user function', function(userId, $ScopedTransaction, done) {
      expect(userId).to.equal(9876);
      done(null, profile);
    });
    var app = express();

    sinon.stub(passportMock, 'deserializeUser', function(deserializerFn) {
      deserializerFn(9876, function(err, result) {
        expect(result).to.equal(profile);
        done();
      });
    });

    Ravel.emit('post config express', app);
  });

  it('should delegate \'get or create user\' functionality to the \'get or create user function\'', function(doneTest) {
    Ravel.db = {
      scoped: function(){}
    };
    var databaseProfile = {
      id: 9876,
      name: 'Sean McIntyre'
    };
    Ravel.set('authorization providers', [{
      init: function(expressApp, passport, getOrCreate) {
        getOrCreate('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
          expect(result).to.deep.equal(databaseProfile);
          doneTest();
        });
      }
    }]);
    Ravel.set('get or create user function', function(accessToken, refreshToken, profile, $ScopedTransaction, done) {
      done(null, databaseProfile);
    });
    var app = express();

    Ravel.emit('post config express', app);
  });
});
