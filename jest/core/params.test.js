const os = require('os');

describe('Ravel', () => {
  let app, conf;
  beforeEach(async () => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    const Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });

  describe('#set()', () => {
    it('should allow clients to set the value of a parameter', async () => {
      app.registerParameter('test param', false);
      app.set('test param', 'test value');
      await app.init();
      expect(app.get('test param')).toBe('test value');
    });

    it('should throw a Ravel.$err.IllegalValue error when a client attempts to set an unknown parameter', async () => {
      expect(() => app.set('unknown param', 'test value')).toThrow(app.$err.IllegalValue);
    });
  });

  describe('#get()', () => {
    it('should allow clients to retrieve the value of a set optional parameter', async () => {
      app.registerParameter('test param', false);
      app.set('test param', 'test value');
      await app.init();
      expect(app.get('test param')).toEqual('test value');
    });

    it('should return undefined when clients attempt to retrieve the value of an unset optional parameter', async () => {
      app.registerParameter('test param', false);
      await app.init();
      expect(app.get('test param')).toEqual(undefined);
    });

    it('should allow clients to retrieve the value of a set required parameter', async () => {
      app.registerParameter('test param', true);
      app.set('test param', 'test value');
      await app.init();
      expect(app.get('test param')).toEqual('test value');
    });

    it('should throw a Ravel.$err.General error when clients attempt to retrieve a parameter before loading', async () => {
      expect(() => {
        app.registerParameter('test param', true);
        app.get('test param');
      }).toThrow(app.$err.General);
    });

    it('should throw a Ravel.$err.NotFound error when clients attempt to retrieve an unregistered parameter', async () => {
      await app.init();
      expect(() => app.get('test param')).toThrow(app.$err.NotFound);
    });

    it('should throw a Ravel.$err.NotFound error when clients attempt to retrieve the value of an unset required parameter', async () => {
      app.registerParameter('test param', true);
      await app.init();
      expect(() => app.get('test param')).toThrow(app.$err.NotFound);
    });
  });

  describe('.config', () => {
    it('should return the full configuration of the given `ravel instance`', async () => {
      const defaultConfig = app.config;
      app.registerParameter('test param', true);
      app.registerParameter('test param 2', true);
      app.set('test param', false);
      app.set('test param 2', 10);

      const expected = {
        'test param': false,
        'test param 2': 10
      };
      Object.assign(expected, defaultConfig);

      expect(app.config).toEqual(expected);
    });
  });

  describe('validateParameters', () => {
    it('should throw app.$err.NotFound when a required parameter is not present', async () => {
      app.registerParameter('test param', true);
      await app.init();
      await expect(app.listen()).rejects.toThrow(app.$err.NotFound);
      await app.close();
    });

    it('should rethrow errors when app.get throws a non-NotFound Error', async () => {
      app.registerParameter('test param', true);
      await app.init();
      app.get = jest.fn(() => { throw new Error(); });
      await expect(app.listen()).rejects.toThrow(Error);
      await app.close();
    });
  });

  describe('#_loadParameters()', () => {
    it('should load defaults if no configuration files are present', async () => {
      const oldParams = {
        'redis port': 6379,
        'redis max retries': 10,
        'redis keepalive interval': 1000,
        'redis websocket channel prefix': 'ravel.ws',
        'port': 8080,
        'app route': '/',
        'login route': '/login',
        'keygrip keys': ['123abc'],
        'session key': 'ravel.sid',
        'session max age': null,
        'log level': 'NONE' // not a default, but we've set this in beforeEach
      };
      app.set('keygrip keys', ['123abc']);
      await app.init();
      // now load params from non-existent ravelrc file
      expect(app.config).toEqual(oldParams);
    });

    it('should allow users to specify Ravel config parameters via a .ravelrc.json config file', async () => {
      conf = {
        'redis port': 1234
      };
      jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => conf, {virtual: true});
      await app.init();
      expect(app.get('redis port')).toEqual(conf['redis port']);
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd', async () => {
      conf = {
        'redis port': 1234
      };
      let parent = app.cwd.split(upath.sep).slice(0, -1).join(upath.sep);
      const root = (os.platform() === 'win32') ? process.cwd().split(upath.sep)[0] : upath.sep;
      parent = parent.length > 0 ? parent : root;
      const joined = upath.toUnix(upath.posix.join(parent, '.ravelrc'));
      jest.doMock(joined, () => conf, {virtual: true});
      await app.init();
      expect(app.get('redis port')).toEqual(conf['redis port']);
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd, including root', async () => {
      conf = {
        'redis port': 1234
      };
      const root = (os.platform() === 'win32') ? process.cwd().split(upath.sep)[0] : upath.sep;
      // can't use extension on mock because mockery only works with exact matches
      const joined = upath.toUnix(upath.posix.join(root, '.ravelrc'));
      jest.doMock(joined, () => conf, {virtual: true});
      await app.init();
      expect(app.get('redis port')).toEqual(conf['redis port']);
    });

    it('should allow users to specify Ravel config parameters via a .ravelrc config file and parse it to JSON', async () => {
      conf = {
        'redis port': 1234
      };
      jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => JSON.stringify(conf), {virtual: true});
      await app.init();
      expect(app.get('redis port')).toEqual(conf['redis port']);
    });

    it('should not override parameters set programmatically via app.set', async () => {
      conf = {
        'redis port': 1234
      };
      jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => conf, {virtual: true});

      app.set('redis port', 6380);
      await app.init();
      expect(app.get('redis port')).toEqual(6380);
    });

    it('should throw a Ravel.$err.IllegalValue if an unregistered paramter is specified in the config file', async () => {
      conf = {
        'redis port': 1234
      };
      conf[Math.random().toString()] = false;
      jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => conf, {virtual: true});

      app.set('redis port', 6380);
      await expect(app.init()).rejects.toThrow(app.$err.IllegalValue);
    });

    it('should throw a SyntaxError if a .ravelrc file is found but is malformed', async () => {
      jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => { throw new SyntaxError(); }, {virtual: true});
      await expect(app.init()).rejects.toThrow(SyntaxError);
    });

    describe('environment variable interpolation', () => {
      beforeEach(() => {
        process.env.REDIS_HOST = 'localhost';
        process.env.REDIS_PORT = '9999';
      });

      afterEach(() => {
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
      });

      it('should interpolate variables in the config value with the value from environment variables', async () => {
        conf = {
          'redis host': '$REDIS_HOST',
          'redis port': '$REDIS_PORT'
        };
        jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => JSON.stringify(conf), {virtual: true});
        await app.init();
        expect(app.get('redis port')).toEqual('9999');
        expect(app.get('redis host')).toEqual('localhost');
      });

      it('should interpolate variables in the config when there are multiple variables', async () => {
        app.registerParameter('redis url', false);
        conf = {
          'redis url': 'redis://$REDIS_HOST:$REDIS_PORT'
        };
        jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => JSON.stringify(conf), {virtual: true});
        await app.init();
        expect(app.get('redis url')).toEqual('redis://localhost:9999');
      });

      it('should throw IllegalValueError when the environment variable referenced in the config value does not exist', async () => {
        app.registerParameter('redis url', false);
        conf = {
          'redis url': 'redis://$REDIS_USER:$REDIS_PASSWORD@$REDIS_HOST:$REDIS_PORT'
        };
        jest.doMock(upath.toUnix(upath.posix.join(app.cwd, '.ravelrc')), () => JSON.stringify(conf), {virtual: true});
        await expect(app.init()).rejects.toThrow(app.$err.IllegalValue);
      });
    });
  });
});
