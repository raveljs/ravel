describe('Ravel', () => {
  let Ravel, app, Module, inject, autoinject;
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.clearAllMocks();

    Module = require('../../lib/ravel').Module;
    Ravel = require('../../lib/ravel');
    inject = require('../../lib/ravel').inject;
    autoinject = require('../../lib/ravel').autoinject;
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.log.NONE);
  });

  describe('#inject()', () => {
    describe('@inject', () => {
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
        await expect(app.init()).rejects.toThrow(app.$err.General);
      });

      it('should throw an $err.NotFound when attempting to inject an unknown module/npm dependency', async () => {
        @Module('stub')
        @inject('unknownModule')
        class Stub {
        }
        app.load(Stub);
        await expect(app.init()).rejects.toThrow(app.$err.NotFound);
      });
    });

    describe('@autoinject', () => {
      it('should facilitate dependency auto-injection of client modules into other client modules', async () => {
        @Module('stub1')
        class Stub1 {
          method () {}
        }

        @Module('stub2')
        @autoinject('stub1')
        class Stub2 { }
        app.load(Stub1, Stub2);
        await app.init();
        expect(typeof app.module('stub2').stub1).toBe('object');
        expect(app.module('stub2').stub1).toHaveProperty('method');
        expect(app.module('stub2').stub1).toEqual(app.module('stub1'));
      });

      it('should facilitate dependency auto-injection of npm modules into client modules', async () => {
        const stubMoment = {
          method: () => {}
        };
        jest.doMock('moment', () => stubMoment, {virtual: true});

        @Module('stub')
        @autoinject('moment')
        class Stub {
        }
        app.load(Stub);
        await app.init();
        expect(typeof app.module('stub').moment).toBe('object');
        expect(app.module('stub').moment).toBe(stubMoment);
      });

      it('should throw an error when attempting to auto-inject an npm dependency with an error in it', async () => {
        jest.doMock('badModule', () => { throw new SyntaxError(); }, {virtual: true});

        @Module('stub')
        @autoinject('badModule')
        class Stub {
        }

        app.load(Stub);
        await expect(app.init()).rejects.toThrow(app.$err.General);
      });

      it('should throw an $err.NotFound when attempting to auto-inject an unknown module/npm dependency', async () => {
        @Module('stub')
        @autoinject('unknownModule')
        class Stub {
        }
        app.load(Stub);
        await expect(app.init()).rejects.toThrow(app.$err.NotFound);
      });

      it('should allow mixing @inject and @autinject', async () => {
        @Module('stub1')
        class Stub1 {
          method () {}
        }

        const stubMoment = {
          method: () => {}
        };
        jest.doMock('moment', () => stubMoment, {virtual: true});
        @Module('stub2')
        @inject('stub1')
        @autoinject('moment')
        class Stub2 {
          constructor (stub1) {
            expect(this.moment).toBeUndefined();
            this.stub1 = stub1;
          }
        }
        app.load(Stub1, Stub2);
        await app.init();
        expect(typeof app.module('stub2').moment).toBe('object');
        expect(app.module('stub2').moment).toBe(stubMoment);
        expect(app.module('stub2').stub1).toHaveProperty('method');
        expect(app.module('stub2').stub1).toEqual(app.module('stub1'));
      });
    });
  });
});
