const Ravel = require('../../lib/ravel');
const Metadata = require('../../lib/util/meta');

describe('Ravel', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  // Testing how Ravel loads things from a directory
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
      @Ravel.Module
      class M1 {}
      @Ravel.Module('hello')
      class M2 {}
      @Ravel.Module
      class M3 {}
      jest.doMock(upath.join(app.cwd, './modules/test1.js'), () => M1, {virtual: true});
      jest.doMock(upath.join(app.cwd, './modules/test2.js'), () => M2, {virtual: true});
      jest.doMock(upath.join(app.cwd, './modules/package/test3.js'), () => M3, {virtual: true});
      app.load = jest.fn();
      app.scan('./modules');
      expect(app.load).toHaveBeenCalledWith(M1, M2, M3);
      // ensure that names are inferred/used appropriately
      expect(Metadata.getClassMetaValue(M1.prototype, '@role', 'name')).toBe('test1');
      expect(Metadata.getClassMetaValue(M2.prototype, '@role', 'name')).toBe('hello');
      expect(Metadata.getClassMetaValue(M3.prototype, '@role', 'name')).toBe('package.test3');
    });
  });
});
