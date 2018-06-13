describe('Ravel', () => {
  const $err = require('../../../lib/util/application_error');
  const Metadata = require('../../../lib/util/meta');
  let transaction;
  beforeEach(() => {
    const Ravel = require('../../../lib/ravel');
    const Resource = Ravel.Resource;
    transaction = Resource.transaction;
  });

  describe('@transaction()', () => {
    it('should throw an $err.IllegalValue if a non-string type is passed to @transaction', () => {
      const test = () => {
        @transaction([])
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should indicate that all connections should be opened when used with no arguments', () => {
      class Stub1 {
        @transaction
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).toEqual([]);
    });

    it('should indicate that all connections should be opened when used without an argument', () => {
      class Stub1 {
        @transaction()
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).toEqual([]);
    });

    it('should indicate which connections should be opened when used with arguments', () => {
      class Stub1 {
        @transaction('mysql', 'redis')
        get () {}
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).toEqual(['mysql', 'redis']);
    });

    it('should be available at the class-level as well, indicating that all connections should be opened when used with no arguments', () => {
      @transaction
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).toEqual([]);
    });

    it('should be available at the class-level as well, indicating that all connections should be opened when used without an argument', () => {
      @transaction()
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).toEqual([]);
    });

    it('should be available at the class-level as well, indicating which connections should be opened when used with arguments', () => {
      @transaction('mysql', 'redis')
      class Stub1 {
        get () {}
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@transaction', 'providers')).toEqual(['mysql', 'redis']);
    });
  });
});
