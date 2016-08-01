'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const sinon = require('sinon');
const koa = require('koa');
const upath = require('upath');

const AuthenticationProvider = (require('../../lib/ravel')).AuthenticationProvider;
class GoogleOAuth2 extends AuthenticationProvider {
  get name() {
    return 'google-oauth2';
  }
}

let Ravel, authconfig, passportMock, coreSymbols;

describe('auth/passport_init', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    passportMock = {
      initialize: function() {
        return function*(next) {
          yield next;
        };
      },
      session: function() {
        return function*(next) {
          yield next;
        };
      },
      serializeUser: function() {},
      deserializeUser: function() {}
    };

    mockery.registerMock('koa-passport', passportMock);

    Ravel = new (require('../../lib/ravel'))();
    authconfig = (require('../../lib/ravel')).Module.authconfig;
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel(Ravel.log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    authconfig = undefined;
    passportMock = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  it('should not initialize passport if no authentication providers are registered', (done) => {
    const app = koa();
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    require('../../lib/auth/passport_init')(Ravel);

    Ravel.emit('post config koa', app);
    Ravel.emit('post module init');
    expect(passportInitSpy).to.not.have.been.called;
    expect(passportSessionSpy).to.not.have.been.called;
    done();
  });

  it('should initialize passport and sessions for koa', (done) => {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      deserializeUser() {
        return Promise.resolve({});
      }
      deserializeOrCreateUser() {
        return Promise.resolve({});
      }
      verify() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './something'), class extends (require('../../lib/ravel')).Module {});
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./something', 'something');
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    const app = koa();
    const useSpy = sinon.spy(app, 'use');
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    const routerMock = {};
    require('../../lib/auth/passport_init')(Ravel, routerMock);

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
    expect(useSpy).to.have.been.called;
    expect(passportInitSpy).to.have.been.called;
    expect(passportSessionSpy).to.have.been.called;
    expect(provider.init).to.have.been.calledWith(routerMock, passportMock);
    done();
  });

  it('should throw ApplicationError.NotFound if an Authentication module is needed and one is not present', (done) => {
    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();
    require('../../lib/auth/passport_init')(Ravel, {});

    const app = koa();
    function test() {
      Ravel.emit('post config koa', app);
      Ravel.emit('post module init');
    }
    expect(test).to.throw(Ravel.ApplicationError.NotFound);
    done();
  });

  it('should use serializeUser to serialize users to a session cookie', (done) => {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      serializeUser(user) {
        return Promise.resolve(user.id);
      }
      deserializeUser() {
        return Promise.resolve({});
      }
      deserializeOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    sinon.stub(passportMock, 'serializeUser', function(serializerFn) {
      serializerFn({id:9876}, function(err, result) {
        expect(result).to.equal(9876);
        done();
      });
    });

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });

  it('should use deserializeUser to deserialize users from session cookies', (done) => {
    const profile = {
      id: 9876
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      serializeUser(user) {
        return Promise.resolve(user.id);
      }
      deserializeUser(userId) {
        expect(userId).to.equal(profile.id);
        return Promise.resolve(profile);
      }
      deserializeOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    sinon.stub(passportMock, 'deserializeUser', function(deserializerFn) {
      deserializerFn(9876, function(err, result) {
        expect(result).to.equal(profile);
        done();
      });
    });

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });

  it('should callback with an error if serializeUser failed', (done) => {
    const profile = {
      id: 9876
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      serializeUser() {
        return Promise.reject(new Error());
      }
      deserializeUser() {
        return Promise.resolve(profile);
      }
      deserializeOrCreateUser() {
        return Promise.resolve({});
      }
      verifyCredential() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    sinon.stub(passportMock, 'serializeUser', function(serializerFn) {
      serializerFn(9876, function(err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });

  it('should callback with an error if deserializeUser failed', (done) => {
    const profile = {
      id: 9876
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      serializeUser(user) {
        return Promise.resolve(user.id);
      }
      deserializeUser(userId) {
        expect(userId).to.equal(profile.id);
        return Promise.reject(new Error());
      }
      deserializeOrCreateUser() {
        return Promise.resolve({});
      }
      verifyCredential() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    sinon.stub(passportMock, 'deserializeUser', function(deserializerFn) {
      deserializerFn(9876, function(err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });

  it('should delegate \'deserializeOrCreateUser\' functionality to an @authconfig Module', (done) => {
    const databaseProfile = {
      id: 9876,
      name: 'Sean McIntyre'
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      verify() {
        return Promise.resolve(databaseProfile);
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    sinon.stub(provider, 'init', function(expressApp, passport, verify) {
      verify('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
        expect(result).to.deep.equal(databaseProfile);
        done();
      });
    });

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });

  it('should callback with an error if the verify function prevents auth provider initialization', (done) => {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      verify() {
        return Promise.reject(new Error());
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(Ravel);
    sinon.stub(provider, 'init', function(router, passport, verify) {
      verify('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    Ravel.emit('post config koa', app);
    Ravel[coreSymbols.moduleInit]();
    Ravel.emit('post module init');
  });
});
