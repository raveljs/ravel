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
      it('should register Resource modules for instantiation and initialization in Ravel.init', async () => {
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
    });
  });
});
