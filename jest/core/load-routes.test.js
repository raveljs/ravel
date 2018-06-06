describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
  });
  // Testing how Ravel loads modules
  describe('load', () => {
    describe('@Routes', () => {
      it('should register Routes modules for instantiation and initialization in Ravel.init', async () => {
        const spy = jest.fn();
        @Ravel.Routes('/')
        class Test {
          method () {
            spy();
          }
        }
        app.load(Test);
        await app.init();
        expect(app.routes('/')).toBeDefined();
        app.routes('/').method();
        expect(spy).toHaveBeenCalled();
      });
    });
  });
});
