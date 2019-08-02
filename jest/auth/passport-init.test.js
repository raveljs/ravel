const AuthenticationProvider = (require('../../lib/ravel')).AuthenticationProvider;
class GoogleOAuth2 extends AuthenticationProvider {
  get name () {
    return 'google-oauth2';
  }
}

let Ravel, ravelApp, authconfig, passportMock;

describe('auth/passport_init', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();
    passportMock = {
      initialize: () => {
        return async function (ctx, next) {
          await next();
        };
      },
      session: () => {
        return async function (ctx, next) {
          await next();
        };
      },
      serializeUser: () => {},
      deserializeUser: () => {}
    };

    jest.doMock('koa-passport', () => passportMock);

    Ravel = require('../../lib/ravel');
    ravelApp = new Ravel();
    ravelApp.set('log level', ravelApp.$log.NONE);
    ravelApp.set('keygrip keys', ['abc']);
    authconfig = Ravel.Module.authconfig;
  });

  it('should not initialize passport if no authentication providers are registered', async () => {
    const passportInitSpy = jest.spyOn(passportMock, 'initialize');
    const passportSessionSpy = jest.spyOn(passportMock, 'session');

    await ravelApp.init();
    expect(passportInitSpy).not.toHaveBeenCalled();
    expect(passportSessionSpy).not.toHaveBeenCalled();
  });

  it('should initialize passport and sessions for koa', async () => {
    // mock auth config
    @authconfig
    @Ravel.Module('authconfig')
    class AuthConfig {
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

    const provider = new GoogleOAuth2(ravelApp);
    provider.init = jest.fn();
    const passportInitSpy = jest.spyOn(passportMock, 'initialize');
    const passportSessionSpy = jest.spyOn(passportMock, 'session');

    ravelApp.load(AuthConfig);
    await ravelApp.init();

    expect(passportInitSpy).toHaveBeenCalled();
    expect(passportSessionSpy).toHaveBeenCalled();
    expect(provider.init).toHaveBeenCalledWith(expect.anything(), passportMock, expect.anything());
  });

  it('should throw $err.NotFound if an Authentication module is needed and one is not present', async () => {
    const provider = new GoogleOAuth2(ravelApp);
    provider.init = jest.fn();
    await expect(ravelApp.init()).rejects.toThrow(ravelApp.$err.NotFound);
  });
});
