describe('Ravel', () => {
  const ApplicationError = require('../../../lib/util/application_error');
  const Metadata = require('../../../lib/util/meta');
  let inject;

  beforeEach(() => {
    inject = require('../../../lib/ravel').inject;
  });

  describe('@inject()', () => {
    it('should decorate a class with inject metadata', () => {
      @inject('test1', 'test2')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).toEqual(['test1', 'test2']);
    });

    it('should be able to be used more than once on the same class', () => {
      @inject('test1', 'test2')
      @inject('test3')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).toEqual(['test1', 'test2', 'test3']);
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @inject', () => {
      const test = () => {
        @inject([])
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow(ApplicationError.IllegalValue);
    });

    it('should throw an ApplicationError.NotFound if @inject is supplied without an argument', () => {
      const test = () => {
        @inject()
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).toThrow(ApplicationError.NotFound);
    });
  });
});
