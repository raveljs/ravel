describe('Ravel', () => {
  const $err = require('../../../lib/util/application_error');
  const Metadata = require('../../../lib/util/meta');
  let autoinject;

  beforeEach(() => {
    autoinject = require('../../../lib/ravel').autoinject;
  });

  describe('@autoinject()', () => {
    it('should decorate a class with inject metadata', () => {
      @autoinject('test1', 'test2')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@autoinject', 'dependencies')).toEqual({
        test1: 'test1',
        test2: 'test2'
      });
    });

    it('should be able to be used more than once on the same class', () => {
      @autoinject('test1', 'test2')
      @autoinject('test3')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@autoinject', 'dependencies')).toEqual({
        test1: 'test1',
        test2: 'test2',
        test3: 'test3'
      });
    });

    it('should facilitate module renaming', () => {
      @autoinject('test1', { test2: 'mytest' })
      @autoinject('test3')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@autoinject', 'dependencies')).toEqual({
        test1: 'test1',
        test2: 'mytest',
        test3: 'test3'
      });
    });

    it('should throw an $err.IllegalValue if a non-string type is passed to @autoinject', () => {
      const test = () => {
        @autoinject(true)
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should throw an $err.IllegalValue if a non-string type is passed to @autoinject within an object', () => {
      const test = () => {
        @autoinject({ one: true })
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should throw an $err.NotFound if @autoinject is supplied without an argument', () => {
      const test = () => {
        @autoinject()
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow($err.NotFound);
    });
  });
});
