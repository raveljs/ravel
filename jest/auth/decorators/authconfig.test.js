const ApplicationError = require('../../../lib/util/application_error');
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

    it('should add auth-related, stub prototype methods to a module if they are not already present', () => {
      @authconfig
      class Stub {}
      const instance = new Stub();
      expect(typeof instance.serializeUser).toBe('function');
      expect(typeof instance.deserializeUser).toBe('function');
      expect(typeof instance.deserializeOrCreateUser).toBe('function');
      expect(typeof instance.verify).toBe('function');
      expect(instance.serializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.verify()).rejects.toThrow(ApplicationError.NotImplemented);
    });

    it('should retain an existing implementation of serializeUser()', () => {
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
      expect(instance.serializeUser({id: 12})).resolves.toBe(12);
      expect(instance.deserializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.verify()).rejects.toThrow(ApplicationError.NotImplemented);
    });

    it('should retain an existing implementation of deserializeUser()', () => {
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
      expect(instance.serializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).resolves.toEqual({});
      expect(instance.deserializeOrCreateUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.verify()).rejects.toThrow(ApplicationError.NotImplemented);
    });

    it('should retain an existing implementation of deserializeOrCreateUser()', () => {
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
      expect(instance.serializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).resolves.toEqual({});
      expect(instance.verify()).rejects.toThrow(ApplicationError.NotImplemented);
    });

    it('should retain an existing implementation of verify()', () => {
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
      expect(instance.serializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).rejects.toThrow(ApplicationError.NotImplemented);
      expect(instance.verify()).resolves.toEqual({});
    });
  });
});
