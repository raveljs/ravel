'use strict';

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const upath = require('upath');
const symbols = require('./symbols');
const Metadata = require('../util/meta');

/*!
 * Simple, recursive directory scanning for `Module`s,
 * `Resource`s and `Routes`.
 * @external Ravel
 */
module.exports = function (Ravel) {
  /**
   * Recursively register `Module`s, `Resource`s and `Routes` with Ravel.
   * Useful for [testing](#testing-ravel-applications).
   *
   * @param {...function} classes - Class prototypes to load.
   * @example
   * const inject = require('ravel').inject;
   * const Module = require('ravel').Module;
   *
   * // &#64;Module('test')
   * class MyModule {
   *   aMethod () {
   *     //...
   *   }
   * }
   * app.load(MyModule);
   * await app.init();
   */
  Ravel.prototype.load = function (...classes) {
    for (const moduleClass of classes) {
      // Determine module role
      const role = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type');
      switch (role) {
        case 'Module':
          this[symbols.loadModule](moduleClass);
          break;
        case 'Resource':
          this[symbols.loadResource](moduleClass);
          break;
        case 'Routes':
          this[symbols.loadRoutes](moduleClass);
          break;
        default:
          throw new this.ApplicationError.IllegalValue(
            `Class ${moduleClass.name} must be decorated with @Module, @Resource or @Routes`);
      }
    }
  };

  /**
   * Recursively register `Module`s, `Resource`s and `Routes` with Ravel,
   * automatically naming them (if necessary) based on their relative path.
   * All files within this directory (recursively) should export a single
   * class which is decorated with `@Module`, `@Resource` or `@Routes`.
   *
   * @param {...string} basePaths - The directories to recursively scan for .js files.
   *                 These files should export a single class which is decorated
   *                 with `@Module`, `@Resource` or `@Routes`.
   * @example
   * // recursively load all `Module`s, `Resource`s and `Routes` in a directory
   * app.scan('./modules');
   * // a Module 'modules/test.js' in ./modules can be injected as `@inject('test')`
   * // a Module 'modules/stuff/test.js' in ./modules can be injected as `@inject('stuff.test')`
   */
  Ravel.prototype.scan = function (...basePaths) {
    for (const basePath of basePath) {
      const absPath = upath.isAbsolute(basePath) ? basePath : upath.join(this.cwd, basePath);
      if (!fs.lstatSync(absPath).isDirectory()) {
        throw new this.ApplicationError.IllegalValue(
          'Base module scanning path \'' + absPath + '\' is not a directory.');
      } else {
        const classes = recursive(absPath)
          .filter(f => upath.extname(f) === '.js')
          .map(f => {
            const moduleClass = require(upath.join(absPath, f));
            const role = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type');
            if (role === 'Module') {
              // derive module name from filename, using subdirectories of basePath
              // as namespacing (unless manually specified)
              const derivedName = upath.trimExt(upath.normalize(f)).split('/').join('.');
              const name = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'name', derivedName);
              Metadata.putClassMeta(moduleClass.prototype, '@role', 'name', name);
            }
            return moduleClass;
          });
        this.load(...classes);
      }
    }
  };
};
