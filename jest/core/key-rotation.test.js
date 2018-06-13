describe('Ravel KeyGrip Keys Rotation', () => {
  beforeEach(() => {
    process.removeAllListeners('unhandledRejection');
  });

  afterEach(() => {
    process.removeAllListeners('unhandledRejection');
  });

  describe('#rotateKeygripKey()', () => {
    it('should allow for key rotation', async () => {
      const initialKeys = ['one', 'two'];
      const Ravel = require('../../lib/ravel');
      const app = new Ravel();
      app.set('log level', app.$log.NONE);
      app.set('keygrip keys', initialKeys);
      await app.init();
      const session = `${Math.random()}`;
      let sig = app.keys.sign(session);
      expect(app.keys.verify(session, sig)).toBe(true);
      expect(app.keys.index(session, sig)).toBe(0);
      app.rotateKeygripKey('three');
      expect(app.keys.verify(session, sig)).toBe(true);
      expect(app.keys.index(session, sig)).toBe(1);
      sig = app.keys.sign(session);
      expect(app.keys.verify(session, sig)).toBe(true);
      expect(app.keys.index(session, sig)).toBe(0);
    });
  });
});
