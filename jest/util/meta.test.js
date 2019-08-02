const $err = require('../../lib/util/application_error');
const Metadata = require('../../lib/util/meta');

describe('util/meta', () => {
  describe('#getMeta', () => {
    it('should support retrieving metadata from a class', () => {
      class Test {}
      expect(Metadata.getMeta(Test.prototype)).toEqual({
        class: {},
        method: {}
      });
    });

    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      function test () {
        return Metadata.getMeta(Test);
      }
      expect(test).toThrow($err.IllegalValue);
    });
  });

  describe('#getClassMeta', () => {
    it('should support the retrieval of class-level metadata within a category', () => {
      class Test {}
      expect(Metadata.getClassMeta(Test.prototype, 'category')).toBe(undefined);
    });
    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.getClassMeta(Test, 'category');
      }).toThrow();
    });
  });

  describe('#getClassMetaValue', () => {
    it('should support the retrieval of a value from a category of class-level metadata', () => {
      class Test {}
      expect(Metadata.getClassMetaValue(Test.prototype, 'category', 'key')).toBe(undefined);
    });
    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.getClassMetaValue(Test, 'category', 'key');
      }).toThrow();
    });
  });

  describe('#getMethodMeta', () => {
    it('should support the retrieval of method-level metadata within a category', () => {
      class Test {}
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', 'category')).toBe(undefined);
    });
    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.getMethodMeta(Test, 'methodName', 'category');
      }).toThrow();
    });
  });

  describe('#getMethodMetaValue', () => {
    it('should support the retrieval of a value from a category of method-level metadata', () => {
      class Test {}
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', 'category', 'key')).toBe(undefined);
    });
    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.getMethodMetaValue(Test, 'methodName', 'category', 'key');
      }).toThrow();
    });
  });

  describe('#putClassMeta', () => {
    it('should support storing metdata at the class-level', () => {
      class Test {}
      Metadata.putClassMeta(Test.prototype, '@inject', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).toEqual({
        class: {
          '@inject': {
            mykey: 'myvalue'
          }
        },
        method: {}
      });
      expect(Metadata.getClassMeta(Test.prototype, '@inject')).toEqual({
        mykey: 'myvalue'
      });
      expect(Metadata.getClassMeta(Test.prototype, '@inject')).toBe(
        Metadata.getMeta(Test.prototype).class['@inject']
      );
      expect(Metadata.getClassMetaValue(Test.prototype, '@inject', 'mykey')).toBe('myvalue');
      expect(Metadata.getClassMetaValue(Test.prototype, '@inject', 'mykey')).toBe(
        Metadata.getMeta(Test.prototype).class['@inject'].mykey
      );
    });

    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.putClassMeta(Test, '@inject', 'mykey', 'myvalue');
      }).toThrow();
    });
  });

  describe('#putMethodMeta', () => {
    it('should support storing metdata at the method-level', () => {
      class Test {}
      Metadata.putMethodMeta(Test.prototype, 'methodName', '@before', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).toEqual({
        class: {},
        method: {
          methodName: {
            '@before': {
              mykey: 'myvalue'
            }
          }
        }
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@before')).toEqual({
        mykey: 'myvalue'
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@before')).toBe(
        Metadata.getMeta(Test.prototype).method.methodName['@before']
      );
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@before', 'mykey')).toBe('myvalue');
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@before', 'mykey')).toBe(
        Metadata.getMeta(Test.prototype).method.methodName['@before'].mykey
      );
      Metadata.putMethodMeta(Test.prototype, 'methodName', '@before', 'anotherkey', 'anothervalue');
      expect(Metadata.getMeta(Test.prototype)).toEqual({
        class: {},
        method: {
          methodName: {
            '@before': {
              mykey: 'myvalue',
              anotherkey: 'anothervalue'
            }
          }
        }
      });
    });

    it('should throw an exception if the target class isn\'t a prototype', () => {
      class Test {}
      expect(() => {
        return Metadata.putMethodMeta(Test, 'methodName', '@inject', 'mykey', 'myvalue');
      }).toThrow();
    });
  });
});
