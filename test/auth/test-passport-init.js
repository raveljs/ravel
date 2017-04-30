'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const mockery = require('mockery');
const sinon = require('sinon');
const Koa = require('koa');
const upath = require('upath');

const AuthenticationProvider = (require('../../lib/ravel')).AuthenticationProvider;
class GoogleOAuth2 extends AuthenticationProvider {
  get name () {
    return 'google-oauth2';
  }
}

let Ravel, ravelApp, authconfig, passportMock, coreSymbols;

describe('auth/passport_init', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    // koa-passport still uses generators!
    passportMock = {
      initialize: () => {
        return function * (next) {
          yield next;
        };
      },
      session: () => {
        return function * (next) {
          yield next;
        };
      },
      serializeUser: () => {},
      deserializeUser: () => {}
    };

    mockery.registerMock('koa-passport', passportMock);

    Ravel = require('../../lib/ravel');
    ravelApp = new Ravel();
    authconfig = Ravel.Module.authconfig;
    coreSymbols = require('../../lib/core/symbols');
    ravelApp.log.setLevel(ravelApp.log.NONE);
    ravelApp.kvstore = {}; // mock ravelApp.kvstore, since we're not actually starting ravelApp.
    done();
  });

  afterEach((done) => {
    ravelApp = undefined;
    authconfig = undefined;
    passportMock = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  it('should not initialize passport if no authentication providers are registered', (done) => {
    const app = new Koa();
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    require('../../lib/auth/passport_init')(ravelApp);

    ravelApp.emit('post config koa', app);
    ravelApp.emit('post module init');
    expect(passportInitSpy).to.not.have.been.called;
    expect(passportSessionSpy).to.not.have.been.called;
    done();
  });

  it('should initialize passport and sessions for koa', (done) => {
    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      deserializeUser () {
        return Promise.resolve({});
      }
      deserializeOrCreateUser () {
        return Promise.resolve({});
      }
      verify () {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './something'), class extends Ravel.Module {});
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./something', 'something');
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();

    const app = new Koa();
    const useSpy = sinon.spy(app, 'use');
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    const routerMock = {};
    require('../../lib/auth/passport_init')(ravelApp, routerMock);

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
    expect(useSpy).to.have.been.called;
    expect(passportInitSpy).to.have.been.called;
    expect(passportSessionSpy).to.have.been.called;
    expect(provider.init).to.have.been.calledWith(routerMock, passportMock);
    done();
  });

  it('should throw ApplicationError.NotFound if an Authentication module is needed and one is not present', (done) => {
    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();
    require('../../lib/auth/passport_init')(ravelApp, {});

    const app = new Koa();
    function test () {
      ravelApp.emit('post config koa', app);
      ravelApp.emit('post module init');
    }
    expect(test).to.throw(ravelApp.ApplicationError.NotFound);
    done();
  });

  it('should use serializeUser to serialize users to a session cookie', (done) => {
    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      serializeUser (user) {
        return Promise.resolve(user.id);
      }
      deserializeUser () {
        return Promise.resolve({});
      }
      deserializeOrCreateUser () {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    sinon.stub(passportMock, 'serializeUser').callsFake(function (serializerFn) {
      serializerFn({id: 9876}, function (e, result) {
        expect(result).to.equal(9876);
        done();
      });
    });

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });

  it('should use deserializeUser to deserialize users from session cookies', (done) => {
    const profile = {
      id: 9876
    };

    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      serializeUser (user) {
        return Promise.resolve(user.id);
      }
      deserializeUser (userId) {
        expect(userId).to.equal(profile.id);
        return Promise.resolve(profile);
      }
      deserializeOrCreateUser () {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    sinon.stub(passportMock, 'deserializeUser').callsFake(function (deserializerFn) {
      deserializerFn(9876, function (e, result) {
        expect(result).to.equal(profile);
        done();
      });
    });

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });

  it('should callback with an error if serializeUser failed', (done) => {
    const profile = {
      id: 9876
    };

    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      serializeUser () {
        return Promise.reject(new Error());
      }
      deserializeUser () {
        return Promise.resolve(profile);
      }
      deserializeOrCreateUser () {
        return Promise.resolve({});
      }
      verifyCredential () {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    sinon.stub(passportMock, 'serializeUser').callsFake(function (serializerFn) {
      serializerFn(9876, function (err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });

  it('should callback with an error if deserializeUser failed', (done) => {
    const profile = {
      id: 9876
    };

    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      serializeUser (user) {
        return Promise.resolve(user.id);
      }
      deserializeUser (userId) {
        expect(userId).to.equal(profile.id);
        return Promise.reject(new Error());
      }
      deserializeOrCreateUser () {
        return Promise.resolve({});
      }
      verifyCredential () {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = sinon.stub();

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    sinon.stub(passportMock, 'deserializeUser').callsFake(function (deserializerFn) {
      deserializerFn(9876, function (err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });

  it('should delegate \'deserializeOrCreateUser\' functionality to an @authconfig Module', (done) => {
    const databaseProfile = {
      id: 9876,
      name: 'Sean McIntyre'
    };

    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      verify () {
        return Promise.resolve(databaseProfile);
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    sinon.stub(provider, 'init').callsFake(function (expressApp, passport, verify) {
      verify('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function (e, result) {
        expect(result).to.deep.equal(databaseProfile);
        done();
      });
    });

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });

  it('should callback with an error if the verify function prevents auth provider initialization', (done) => {
    // mock auth config
    @authconfig
    class AuthConfig extends Ravel.Module {
      verify () {
        return Promise.reject(new Error());
      }
    }
    mockery.registerMock(upath.join(ravelApp.cwd, './authconfig'), AuthConfig);
    ravelApp.module('./authconfig', 'authconfig');

    const provider = new GoogleOAuth2(ravelApp);
    sinon.stub(provider, 'init').callsFake(function (router, passport, verify) {
      verify('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function (err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    require('../../lib/auth/passport_init')(ravelApp);
    const app = new Koa();

    ravelApp.emit('post config koa', app);
    ravelApp[coreSymbols.moduleInit]();
    ravelApp.emit('post module init');
  });
});
