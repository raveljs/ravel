'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const sinon = require('sinon');
const koa = require('koa');

let Ravel, passportMock;

describe('auth/passport_init', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

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

    mockery.registerMock('passport', passportMock);

    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    passportMock = undefined;
    mockery.deregisterAll();
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
    const app = koa();
    const useSpy = sinon.spy(app, 'use');
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    Ravel.emit('post config koa', app);
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

  it('should initialize passport and sessions for koa', function(done) {
    const initStub = sinon.stub();
    Ravel.set('authorization providers', [{
      init: initStub
    }]);
    const app = koa();
    const useSpy = sinon.spy(app, 'use');
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    Ravel.emit('post config koa', app);
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
    const app = koa();

    sinon.stub(passportMock, 'serializeUser', function(serializerFn) {
      serializerFn({id:9876}, function(err, result) {
        expect(result).to.equal(9876);
        done();
      });
    });

    Ravel.emit('post config koa', app);
  });

  it('should use user.id to deserialize users from session cookies', function(done) {
    Ravel.set('authorization providers', [{
      init: sinon.stub()
    }]);
    Ravel.db = {
      scoped: function(){}
    };
    const profile = {
      id: 9876
    };
    Ravel.set('get user function', function(userId, $ScopedTransaction, d) {
      expect(userId).to.equal(9876);
      d(null, profile);
    });
    const app = koa();

    sinon.stub(passportMock, 'deserializeUser', function(deserializerFn) {
      deserializerFn(9876, function(err, result) {
        expect(result).to.equal(profile);
        done();
      });
    });

    Ravel.emit('post config koa', app);
  });

  it('should delegate \'get or create user\' functionality to the \'get or create user function\'', function(doneTest) {
    Ravel.db = {
      scoped: function(){}
    };
    const databaseProfile = {
      id: 9876,
      name: 'Sean McIntyre'
    };
    Ravel.set('authorization providers', [{
      init: function(koaApp, passport, getOrCreate) {
        getOrCreate('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
          expect(result).to.deep.equal(databaseProfile);
          doneTest();
        });
      }
    }]);
    Ravel.set('get or create user function', function(accessToken, refreshToken, profile, $ScopedTransaction, done) {
      done(null, databaseProfile);
    });
    const app = koa();

    Ravel.emit('post config koa', app);
  });
});
