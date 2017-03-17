'use strict';

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const upath = require('upath');

/*!
 * Simple, recursive directory scanning for modules
 * to make it easier to register lots of them via
 * Ravel.module
 * @external Ravel
 */
module.exports = function (Ravel) {
  /**
   * Recursively register `Module`s and plain classes with Ravel (see [core/module](module.js.html)),
   * automatically naming them based on their relative path. All files within this directory (recursively)
   * should export a single class which may or may not extend `Module`.
   *
   * @param {String} basePath The directory to recursively scan for .js files.
   *                 These files should export a single class extending Ravel.Module
   * @example
   *   // recursively load all Modules in a directory
   *   app.modules('./modules')
   *   // a Module 'modules/test.js' in ./modules can be injected as `@inject('test')`
   *   // a Module 'modules/stuff/test.js' in ./modules can be injected as `@inject('stuff.test')`
   */
  Ravel.prototype.modules = function (basePath) {
    const absPath = upath.isAbsolute(basePath) ? basePath : upath.join(this.cwd, basePath);
    if (!fs.lstatSync(absPath).isDirectory()) {
      throw new this.ApplicationError.IllegalValue(
        'Base module scanning path \'' + absPath + '\' is not a directory.');
    } else {
      for (let file of recursive(absPath)) {
        if (upath.extname(file) === '.js') {
          // derive module name from filename, using subdirectories of basePath as namespacing
          const name = upath.trimExt(upath.normalize(file)).split('/').join('.');
          // declare module
          this.module(upath.join(absPath, file), name);
        }
      }
    }
  };
};
