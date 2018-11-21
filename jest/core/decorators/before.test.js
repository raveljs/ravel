describe('Ravel', () => {
  const $err = require('../../../lib/util/application_error');
  const Metadata = require('../../../lib/util/meta');
  let before;

  beforeEach(() => {
    before = require('../../../lib/ravel').Resource.before;
  });

  describe('@before()', () => {
    it('should decorate a class with middleware that should precede every endpoint defined within', () => {
      @before('test1', 'test2')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@before', 'middleware')).toEqual(['test1', 'test2']);
    });

    it('should throw an $err.IllegalValue if a non-string type is passed to @before', () => {
      const test = () => {
        @before([])
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should throw an $err.NotFound if @before is supplied without an argument', () => {
      const test = () => {
        @before()
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.NotFound);
    });

    it('should throw an $err.IllegalValue if an empty object literal is passed to @before', () => {
      const test = () => {
        @before({})
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should throw an $err.IllegalValue if an object literal is passed to @before without an object literal value', () => {
      const test = () => {
        @before({'middleware1': 'not an object literal'})
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should throw an $err.IllegalValue if an object literal is passed to @before with multiple entries', () => {
      const test = () => {
        @before({'middleware1': {'name': 'sean'}, 'middleware2': {'name': 'adam'}})
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should decorate a class with method-specific middleware if @before is applied to a method', () => {
      class Stub1 {
        @before('test1', 'test2')
        get () {
        }
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@before', 'middleware')).toEqual(['test1', 'test2']);
    });
  });
});
