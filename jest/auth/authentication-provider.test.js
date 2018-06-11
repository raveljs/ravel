describe('auth/authentication_provider', () => {
  let Ravel, ravelApp, provider;
  beforeEach(() => {
    Ravel = require('../../lib/ravel');
    ravelApp = new Ravel();
    ravelApp.log.setLevel(ravelApp.log.NONE); // because we won't init
    class TestProvider extends Ravel.AuthenticationProvider {
      get name () {
        return 'test';
      }
    }
    provider = new TestProvider(ravelApp);
  });

  describe('constructor', () => {
    it('should allow clients to implement an authentication provider which has a name and several methods', async () => {
      class GoogleOAuth2 extends Ravel.AuthenticationProvider {
        get name () {
          return 'google-oauth2';
        }
      }
      provider = new GoogleOAuth2(ravelApp);
      ravelApp.emit('pre listen');
      expect(provider.name).toBe('google-oauth2');
      expect(typeof provider.init).toBe('function');
      expect(typeof provider.handlesClient).toBe('function');
      expect(typeof provider.credentialToProfile).toBe('function');
      expect(typeof provider.log).toBe('object');
      expect(typeof provider.ravelInstance).toBe('object');
      expect(typeof provider.ApplicationError).toBe('function');
    });

    it('should require clients to supply a name for the provider', () => {
      expect(() => {
        new Ravel.AuthenticationProvider(ravelApp); // eslint-disable-line no-new
      }).toThrow(ravelApp.ApplicationError.NotImplemented);
    });
  });

  describe('#init()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', () => {
      expect(() => provider.init()).toThrow(ravelApp.ApplicationError.NotImplemented);
    });
  });

  describe('#handlesClient()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', () => {
      expect(() => provider.handlesClient()).toThrow(ravelApp.ApplicationError.NotImplemented);
    });
  });

  describe('#credentialToProfile()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', async () => {
      await expect(provider.credentialToProfile()).rejects.toThrow(ravelApp.ApplicationError.NotImplemented);
    });
  });

  describe('ravelApp.authorizationProviders', () => {
    it('should return an empty Array if no AuthorizationProviders are registered', () => {
      ravelApp = new Ravel();
      expect(typeof ravelApp.authenticationProviders).toBe('function');
      expect(Array.isArray(ravelApp.authenticationProviders())).toBe(true);
      expect(ravelApp.authenticationProviders().length).toBe(0);
    });

    it('should return an Array of registered AuthorizationProviders', async () => {
      class GoogleOAuth2 extends Ravel.AuthenticationProvider {
        get name () {
          return 'google-oauth2';
        }
      }
      provider = new GoogleOAuth2(ravelApp);
      expect(typeof ravelApp.authenticationProviders).toBe('function');
      expect(Array.isArray(ravelApp.authenticationProviders())).toBe(true);
      expect(ravelApp.authenticationProviders().length).toBe(2);
      expect(ravelApp.authenticationProviders()[1]).toBe(provider);
    });

    it('should require clients to supply a name for the provider', () => {
      expect(() => {
        new Ravel.AuthenticationProvider(ravelApp); // eslint-disable-line no-new
      }).toThrow(ravelApp.ApplicationError.NotImplemented);
    });
  });
});
