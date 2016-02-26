'use strict';

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const upath = require('upath');

/**
 * Simple, recursive directory scanning for modules
 * to make it easier to register lots of them via
 * Ravel.module
 */
module.exports = function(Ravel) {
  /**
   * Recursively register modules with Ravel (see core/module)
   *
   * @param {String} basePath the directory to start scanning recursively for .js files
   */
  Ravel.prototype.modules = function(basePath) {
    if (!fs.lstatSync(basePath).isDirectory()) {
      throw new this.ApplicationError.IllegalValue(
        'Base module scanning path \'' + basePath + '\' is not a directory.');
    } else {
      for (let file of recursive(basePath)) {
        if (upath.extname(file) === '.js') {
          this.module(upath.join(basePath, file));
        }
      }
    }
  };
};
