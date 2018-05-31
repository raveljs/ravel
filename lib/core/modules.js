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
      for (const file of recursive(absPath)) {
        if (upath.extname(file) === '.js') {
          // Determine module role
          const moduleClass = require(absPath);
          const role = Metadata.getClassMetaValue(moduleClass.prototype, '@role', 'type');
          switch (role) {
            case 'Module':
              // derive module name from filename, using subdirectories of basePath as namespacing
              const name = upath.trimExt(upath.normalize(file)).split('/').join('.');
              this.module(upath.join(absPath, file), name);
              break;
            case 'Resource':
              this.resource(upath.join(absPath, file));
              break;
            case 'Routes':
              this.routes(upath.join(absPath, file));
              break;
          }
        }
      }
    }
  };
};
