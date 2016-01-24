'use strict';

/**
 * Simple, recursive directory scanning for modules
 * to make it easier to register lots of them via
 * Ravel.module
 */

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const path = require('path');

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
        if (path.extname(file) === '.js') {
          this.module(path.join(basePath, file));
        }
      }
    }
  };
};
