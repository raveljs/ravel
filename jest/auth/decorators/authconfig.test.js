const $err = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');

describe('Ravel', () => {
  let authconfig;
  beforeEach(() => {
    authconfig = require('../../../lib/ravel').Module.authconfig;
  });

  describe('@authconfig()', () => {
    it('should decorate a class with a hidden property indicating it is an authconfig module', () => {
      @authconfig
      class Stub {}
      const instance = new Stub();
      expect(Metadata.getClassMetaValue(Object.getPrototypeOf(instance), '@authconfig', 'enabled', false)).toBe(true);
    });

    it('should add auth-related, stub prototype methods to a module if they are not already present', async () => {
      @authconfig
      class Stub {}
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      await expect(instance.serializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeOrCreateUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.verify()).rejects.toThrow($err.NotImplemented);
    });

    it('should retain an existing implementation of serializeUser()', async () => {
      @authconfig
      class Stub {
        serializeUser (user) {
          return Promise.resolve(user.id);
        }
      }
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      await expect(instance.serializeUser({ id: 12 })).resolves.toBe(12);
      await expect(instance.deserializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeOrCreateUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.verify()).rejects.toThrow($err.NotImplemented);
    });

    it('should retain an existing implementation of deserializeUser()', async () => {
      @authconfig
      class Stub {
        deserializeUser () {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      await expect(instance.serializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeUser()).resolves.toEqual({});
      await expect(instance.deserializeOrCreateUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.verify()).rejects.toThrow($err.NotImplemented);
    });

    it('should retain an existing implementation of deserializeOrCreateUser()', async () => {
      @authconfig
      class Stub {
        deserializeOrCreateUser () {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      await expect(instance.serializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeOrCreateUser()).resolves.toEqual({});
      await expect(instance.verify()).rejects.toThrow($err.NotImplemented);
    });

    it('should retain an existing implementation of verify()', async () => {
      @authconfig
      class Stub {
        verify () {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      await expect(instance.serializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.deserializeOrCreateUser()).rejects.toThrow($err.NotImplemented);
      await expect(instance.verify()).resolves.toEqual({});
    });
  });
});
