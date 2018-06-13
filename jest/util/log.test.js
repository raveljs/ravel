describe('Ravel.$log', () => {
  let app, intel, intelLogger;
  beforeEach(async () => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    // we have to completely mock intel because its
    // methods are read-only, so sinon can't touch them :(
    intelLogger = {
      trace: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      critical: jest.fn()
    };
    intel = {
      TRACE: 'TRACE',
      VERBOSE: 'VERBOSE',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL',
      NONE: 'NONE',
      ALL: 'ALL',
      getLogger: jest.fn(() => {
        return intelLogger;
      }),
      setLevel: jest.fn(),
      basicConfig: jest.fn(),
      trace: jest.fn(),
      verbose: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      critical: jest.fn()
    };
    jest.doMock('intel', () => intel);
    app = new (require('../../lib/ravel'))();
    app.set('keygrip keys', ['abc']);
  });

  describe('#setLevel()', () => {
    it('should allow clients to set the logging level', async () => {
      app.set('log level', app.$log.TRACE);
      await app.init();
      expect(intel.setLevel).toHaveBeenCalledTimes(1);
      expect(intel.setLevel).toHaveBeenCalledWith(intel.TRACE);
    });

    it('should throw $err.IllegalValue when an unknown log level is specified', async () => {
      app.set('log level', 'HIGHEST LOG LEVEL EVER');
      await expect(app.init()).rejects.toThrow(app.$err.IllegalValue);
    });
  });

  describe('#trace()', () => {
    it('should allow logging at the trace level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.trace(message);
      expect(intelLogger.trace).toHaveBeenCalledWith(message);
    });
  });

  describe('#verbose()', () => {
    it('should allow logging at the verbose level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.verbose(message);
      expect(intelLogger.verbose).toHaveBeenCalledWith(message);
    });
  });

  describe('#debug()', () => {
    it('should allow logging at the debug level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.debug(message);
      expect(intelLogger.debug).toHaveBeenCalledWith(message);
    });
  });

  describe('#info()', () => {
    it('should allow logging at the info level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.info(message);
      expect(intelLogger.info).toHaveBeenCalledWith(message);
    });
  });

  describe('#warn()', () => {
    it('should allow logging at the warn level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.warn(message);
      expect(intelLogger.warn).toHaveBeenCalledWith(message);
    });
  });

  describe('#error()', () => {
    it('should allow logging at the error level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.error(message);
      expect(intelLogger.error).toHaveBeenCalledWith(message);
    });
  });

  describe('#critical()', () => {
    it('should allow logging at the critical level', async () => {
      await app.init();
      const message = 'a message';
      app.$log.critical(message);
      expect(intelLogger.critical).toHaveBeenCalledWith(message);
    });
  });

  describe('#getLogger()', () => {
    it('should return a named logger with identical logging methods to the root logger', async () => {
      await app.init();
      const logger = app.$log.getLogger('name');
      const message = 'a message';
      expect(typeof logger.trace).toBe('function');
      logger.trace(message);
      expect(intelLogger.trace).toHaveBeenCalledWith(message);
      expect(typeof logger.verbose).toBe('function');
      logger.verbose(message);
      expect(intelLogger.verbose).toHaveBeenCalledWith(message);
      expect(typeof logger.debug).toBe('function');
      logger.debug(message);
      expect(intelLogger.debug).toHaveBeenCalledWith(message);
      expect(typeof logger.info).toBe('function');
      logger.info(message);
      expect(intelLogger.info).toHaveBeenCalledWith(message);
      expect(typeof logger.warn).toBe('function');
      logger.warn(message);
      expect(intelLogger.warn).toHaveBeenCalledWith(message);
      expect(typeof logger.error).toBe('function');
      logger.error(message);
      expect(intelLogger.error).toHaveBeenCalledWith(message);
      expect(typeof logger.critical).toBe('function');
      logger.critical(message);
      expect(intelLogger.critical).toHaveBeenCalledWith(message);
    });
  });

  describe('on(\'start\')', () => {
    it('should set the default log level on \'start\' if none was specified via Ravel.set(\'log level\')', async () => {
      await app.init();
      expect(intel.setLevel).toHaveBeenCalledTimes(1);
      expect(intel.setLevel).toHaveBeenCalledWith(intel.DEBUG);
    });

    it('should set the client selected log level on \'start\' if one was specified via Ravel.set(\'log level\')', async () => {
      app.set('log level', app.$log.ERROR);
      await app.init();
      expect(intel.setLevel).toHaveBeenCalledTimes(1);
      expect(intel.setLevel).toHaveBeenCalledWith(intel.ERROR);
    });
  });
});
