describe('Ravel', () => {
  let Ravel, app, Module, inject;
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();

    Module = require('../../lib/ravel').Module;
    Ravel = require('../../lib/ravel');
    inject = require('../../lib/ravel').inject;
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
  });

  describe('#inject()', () => {
    it('should facilitate dependency injection of client modules into other client modules', async () => {
      @Module('stub1')
      class Stub1 {
        method () {}
      }

      @Module('stub2')
      @inject('stub1')
      class Stub2 {
        constructor (stub1) {
          this.stub1 = stub1;
        }
      }
      app.load(Stub1, Stub2);
      await app.init();
      expect(typeof app.module('stub2').stub1).toBe('object');
      expect(app.module('stub2').stub1).toHaveProperty('method');
      expect(app.module('stub2').stub1).toEqual(app.module('stub1'));
    });

    it('should facilitate dependency injection of npm modules into client modules', async () => {
      const stubMoment = {
        method: () => {}
      };
      jest.doMock('moment', () => stubMoment, {virtual: true});

      @Module('stub')
      @inject('moment')
      class Stub {
        constructor (moment) {
          this.moment = moment;
        }
      }
      app.load(Stub);
      await app.init();
      expect(typeof app.module('stub').moment).toBe('object');
      expect(app.module('stub').moment).toBe(stubMoment);
    });

    it('should throw an error when attempting to inject an npm dependency with an error in it', async () => {
      jest.doMock('badModule', () => { throw new SyntaxError(); }, {virtual: true});

      @Module('stub')
      @inject('badModule')
      class Stub {
      }

      app.load(Stub);
      await expect(app.init()).rejects.toThrow(app.ApplicationError.General);
    });

    it('should throw an ApplicationError.NotFound when attempting to inject an unknown module/npm dependency', async () => {
      @Module('stub')
      @inject('unknownModule')
      class Stub {
      }
      app.load(Stub);
      await expect(app.init()).rejects.toThrow(app.ApplicationError.NotFound);
    });
  });
});
