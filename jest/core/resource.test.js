describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
  });
  // Testing how Ravel loads resources
  describe('load', () => {
    describe('@Routes', () => {
      it('should register resource modules for instantiation and initialization in Ravel.init', async () => {
        const spy = jest.fn();
        @Ravel.Resource('/')
        class Test {
          method () {
            spy();
          }
        }
        app.load(Test);
        await app.init();
        expect(app.resource('/')).toBeDefined();
        app.resource('/').method();
        expect(spy).toHaveBeenCalled();
      });

      it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a resource module without a basePath', async () => {
        expect(() => {
          @Ravel.Resource
          class Test {}
          app.load(Test);
        }).toThrowError(app.ApplicationError.IllegalValue);
      });

      it('should throw an ApplicationError.NotImplemented when a client attempts to access @mapping on a Resource', () => {
        const shouldThrow = () => {
          @Ravel.Resource('/')
          @Ravel.Resource.mapping()
          class Test {}
          app.load(Test);
        };
        expect(shouldThrow).toThrowError(app.ApplicationError.NotImplemented);
      });

      it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource modules with the same basePath', () => {
        @Ravel.Resource('/')
        class Test {}
        @Ravel.Resource('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.ApplicationError.DuplicateEntry);
      });

      it('should throw a Ravel.ApplicationError.DuplicateEntry error when clients attempt to register multiple resource and routes modules with the same basePath', () => {
        @Ravel.Resource('/')
        class Test {}
        @Ravel.Routes('/')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.ApplicationError.DuplicateEntry);
      });

      it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a resource module without appropriate decoration', async () => {
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.ApplicationError.IllegalValue);
      });
    });
  });
});
