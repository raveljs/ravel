describe('db/database_provider', () => {
  let app, DatabaseProvider, provider;
  beforeEach(() => {
    const Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
    DatabaseProvider = Ravel.DatabaseProvider;
    provider = new DatabaseProvider(app, 'name');
  });

  describe('constructor', () => {
    it('should allow clients to implement a database provider which has a name and several methods', async () => {
      provider = new DatabaseProvider(app, 'mysql');
      expect(provider.name).toBe('mysql');
      expect(typeof provider.getTransactionConnection).toBe('function');
      expect(typeof provider.exitTransaction).toBe('function');
    });

    it('should provide a DatabaseProvider with a logger for use in its methods', async () => {
      expect(typeof provider.$log).toBe('object');
      expect(typeof provider.$log.trace).toBe('function');
      expect(typeof provider.$log.verbose).toBe('function');
      expect(typeof provider.$log.debug).toBe('function');
      expect(typeof provider.$log.info).toBe('function');
      expect(typeof provider.$log.warn).toBe('function');
      expect(typeof provider.$log.error).toBe('function');
      expect(typeof provider.$log.critical).toBe('function');
    });
  });

  describe('#getTransactionConnection()', () => {
    it('should throw Ravel.$err.NotImplemented, since this is a template', async () => {
      await expect(provider.getTransactionConnection()).rejects.toThrow(app.$err.NotImplemented);
    });
  });

  describe('#exitTransaction()', () => {
    it('should throw Ravel.$err.NotImplemented, since this is a template', async () => {
      await expect(provider.exitTransaction()).rejects.toThrow(app.$err.NotImplemented);
    });
  });

  describe('pre listen', () => {
    it('should call prelisten() on Ravel.emit(\'pre listen\')', async () => {
      const prelistenHook = jest.spyOn(provider, 'prelisten');
      await app.emit('pre listen');
      expect(prelistenHook).toHaveBeenCalledTimes(1);
    });

    it('should emit errors if prelisten() throws something', async () => {
      provider.prelisten = jest.fn(function () {
        throw new Error();
      });
      const errorSpy = jest.fn();
      app.once('error', errorSpy);
      await app.emit('pre listen');
      expect(provider.prelisten).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('end', () => {
    it('should call end() on Ravel.emit(\'end\')', async () => {
      provider.end = jest.fn();
      await app.emit('end');
      expect(provider.end).toHaveBeenCalledTimes(1);
    });
  });
});
