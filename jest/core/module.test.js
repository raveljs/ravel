describe('Ravel', () => {
  describe('@Module', () => {
    it('should do something', () => {
      @Ravel.Module('test')
      class Test {
        method () {
          // do something
        }
      }
      const app = new Ravel();
      app.load(Test);
    });
  });
});
