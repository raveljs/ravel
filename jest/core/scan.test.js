describe('Ravel', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Testing how Ravel loads modules from a directory
  describe('scan', () => {
    // TODO include routes and resources
    it('should attempt to load classes from files within a directory', () => {
      jest.doMock('fs-readdir-recursive', () => {
        return () => ['test1.js', 'test2.js', '.eslintrc', 'package/test3.js'];
      });
      const fs = require('fs');
      jest.spyOn(fs, 'lstatSync').mockImplementation(function () {
        return {
          isDirectory: function () { return true; }
        };
      });
      const app = new (require('../../lib/ravel'))();
      const m1 = class {};
      const m2 = class {};
      const m3 = class {};
      jest.doMock(upath.join(app.cwd, './modules/test1.js'), () => m1, {virtual: true});
      jest.doMock(upath.join(app.cwd, './modules/test2.js'), () => m2, {virtual: true});
      jest.doMock(upath.join(app.cwd, './modules/package/test3.js'), () => m3, {virtual: true});
      app.load = jest.fn();
      app.scan('./modules');
      expect(app.load).toHaveBeenCalledWith(m1, m2, m3);
    });

    describe('@Module', () => {
      it('should register modules for instantiation and initialization in Ravel.init', async () => {
        const Ravel = require('../../lib/ravel');
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

      it('should throw a Ravel.ApplicationError.IllegalValue error when clients attempt to register a module without a name', async () => {
        const Ravel = require('../../lib/ravel');
        @Ravel.Module
        class Test {}
        const app = new Ravel();
        app.set('log level', app.log.NONE);
        expect(() => app.load(Test)).toThrowError(app.ApplicationError.IllegalValue);
      });
    });
  });
});
