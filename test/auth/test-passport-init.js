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

const AuthorizationProvider = (require('../../lib/ravel')).AuthorizationProvider;
class GoogleOAuth2 extends AuthorizationProvider {
  constructor() {
    super('google-oauth2');
  }
}

let Ravel, authconfig, passportMock, coreSymbols;

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
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    authconfig = undefined;
    passportMock = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  it('should not initialize passport if no authorization providers are registered', function(done) {
    const app = koa();
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    require('../../lib/auth/passport_init')(Ravel);

    Ravel.emit('post config koa', app);
    expect(passportInitSpy).to.not.have.been.called;
    expect(passportSessionSpy).to.not.have.been.called;
    done();
  });

  it('should initialize passport and sessions for koa', function(done) {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getUser() {
        return Promise.resolve({});
      }
      getOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './something'), class extends (require('../../lib/ravel')).Module {});
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./something', 'something');
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();

    Ravel.set('authorization providers', [provider]);
    const app = koa();
    const useSpy = sinon.spy(app, 'use');
    const passportInitSpy = sinon.spy(passportMock, 'initialize');
    const passportSessionSpy = sinon.spy(passportMock, 'session');

    require('../../lib/auth/passport_init')(Ravel);

    Ravel.emit('post config koa', app);
    expect(useSpy).to.have.been.called;
    expect(passportInitSpy).to.have.been.called;
    expect(passportSessionSpy).to.have.been.called;
    expect(provider.init).to.have.been.calledWith(app, passportMock);
    done();
  });

  it('should throw ApplicationError.NotFound if an Authorization module is needed and one is not present', function(done) {
    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();
    Ravel.set('authorization providers', [provider]);
    require('../../lib/auth/passport_init')(Ravel);

    const app = koa();
    function test() {
      Ravel.emit('post config koa', app);
    }
    expect(test).to.throw(Ravel.ApplicationError.NotFound);
    done();
  });

  it('should use user.id to serialize users to a session cookie', function(done) {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getUser() {
        return Promise.resolve({});
      }
      getOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();

    Ravel.set('authorization providers', [provider]);
    require('../../lib/auth/passport_init')(Ravel);
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
    const profile = {
      id: 9876
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getUser(userId) {
        expect(userId).to.equal(profile.id);
        return Promise.resolve(profile);
      }
      getOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();

    Ravel.set('authorization providers', [provider]);
    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    sinon.stub(passportMock, 'deserializeUser', function(deserializerFn) {
      deserializerFn(9876, function(err, result) {
        expect(result).to.equal(profile);
        done();
      });
    });

    Ravel.emit('post config koa', app);
  });

  it('should callback with an error if getUserFunction failed', function(done) {
    const profile = {
      id: 9876
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getUser(userId) {
        expect(userId).to.equal(profile.id);
        return Promise.reject(new Error());
      }
      getOrCreateUser() {
        return Promise.resolve({});
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    provider.init = sinon.stub();

    Ravel.set('authorization providers', [provider]);
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
  });

  it('should delegate \'getOrCreateUser\' functionality to an @authconfig Module', function(done) {
    const databaseProfile = {
      id: 9876,
      name: 'Sean McIntyre'
    };

    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getOrCreateUser() {
        return Promise.resolve(databaseProfile);
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    sinon.stub(provider, 'init', function(expressApp, passport, getOrCreate) {
      getOrCreate('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
        expect(result).to.deep.equal(databaseProfile);
        done();
      });
    });

    Ravel.set('authorization providers', [provider]);
    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    Ravel.emit('post config koa', app);
  });

  it('should callback with an error if the getOrCreateUser function prevents auth provider initialization', function(done) {
    //mock auth config
    @authconfig
    class AuthConfig extends (require('../../lib/ravel')).Module {
      getOrCreateUser() {
        return Promise.reject(new Error());
      }
    }
    mockery.registerMock(upath.join(Ravel.cwd, './authconfig'), AuthConfig);
    Ravel.module('./authconfig', 'authconfig');
    Ravel[coreSymbols.moduleInit]();

    const provider = new GoogleOAuth2();
    sinon.stub(provider, 'init', function(expressApp, passport, getOrCreate) {
      getOrCreate('testAccessToken', 'testRefreshToken', {name: 'Sean McIntyre'}, function(err, result) {
        expect(result).to.be.not.ok;
        expect(err).to.be.instanceof(Error);
        done();
      });
    });

    Ravel.set('authorization providers', [provider]);
    require('../../lib/auth/passport_init')(Ravel);
    const app = koa();

    Ravel.emit('post config koa', app);
  });
});
