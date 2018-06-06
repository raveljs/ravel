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
  });
});
