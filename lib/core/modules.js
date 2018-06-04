'use strict';

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const upath = require('upath');
const Metadata = require('../util/meta');

/*!
 * Simple, recursive directory scanning for `Module`s,
 * `Resource`s and `Routes`.
 * @external Ravel
 */
module.exports = function (Ravel) {
  /**
   * Recursively register `Module`s, `Resource`s and `Routes` with Ravel.
   *
   * @param {...function} classes - Class prototypes to load.
   */
  Ravel.prototype.load = function (...classes) {
    for (const moduleClass of classes) {
      // Determine module role
      const role = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type');
      switch (role) {
        case 'Module':
          this.module(moduleClass);
          break;
        case 'Resource':
          this.resource(moduleClass);
          break;
        case 'Routes':
          this.routes(moduleClass);
          break;
      }
    }
  };

  /**
   * Recursively register `Module`s, `Resource`s and `Routes` with Ravel,
   * automatically naming them (if necessary) based on their relative path.
   * All files within this directory (recursively) should export a single
   * class which is decorated with `@Module`, `@Resource` or `@Routes`.
   *
   * @param {string} basePath - The directory to recursively scan for .js files.
   *                 These files should export a single class which is decorated
   *                 with `@Module`, `@Resource` or `@Routes`.
   * @example
   * // recursively load all `Module`s, `Resource`s and `Routes` in a directory
   * app.scan('./modules');
   * // a Module 'modules/test.js' in ./modules can be injected as `@inject('test')`
   * // a Module 'modules/stuff/test.js' in ./modules can be injected as `@inject('stuff.test')`
   */
  Ravel.prototype.scan = function (basePath) {
    const absPath = upath.isAbsolute(basePath) ? basePath : upath.join(this.cwd, basePath);
    if (!fs.lstatSync(absPath).isDirectory()) {
      throw new this.ApplicationError.IllegalValue(
        'Base module scanning path \'' + absPath + '\' is not a directory.');
    } else {
      const classes = recursive(absPath)
        .filter(f => upath.extname(f) === '.js')
        .map(f => {
          const moduleClass = require(absPath);
          const role = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type');
          if (role === 'Module') {
            // derive module name from filename, using subdirectories of basePath
            // as namespacing (unless manually specified)
            const derivedName = upath.trimExt(upath.normalize(f)).split('/').join('.');
            const name = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'name', derivedName);
            Metadata.setClassMetaValue(moduleClass.prototype, '@role', 'name', name);
          }
          return moduleClass;
        });
      return this.load(classes);
    }
  };
};
