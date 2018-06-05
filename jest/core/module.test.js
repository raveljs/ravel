describe('Ravel', () => {
  describe('@Module', () => {
    it('should register modules for instantiation and initialization in Ravel.init', async () => {
      const spy = jest.fn();
      @Ravel.Module('test')
      class Test {
        method () {
          spy();
        }
      }
      const app = new Ravel();
      app.set('keygrip keys', ['abc']);
      app.set('log level', app.log.NONE);
      app.load(Test);
      await app.init();
      expect(app.module('test')).toBeDefined();
      app.module('test').method();
      expect(spy).toHaveBeenCalled();
    });
  });
});
