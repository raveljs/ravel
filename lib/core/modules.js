'use strict';

/**
 * Simple, recursive directory scanning for modules
 * to make it easier to register lots of them via
 * Ravel.module
 */

var recursive = require('fs-readdir-recursive');
var fs = require('fs');
var path = require('path');

module.exports = function(Ravel) {

  /**
   * Recursively register modules with Ravel (see core/module)
   *
   * @param {String} basePath the directory to start scanning recursively for .js files
   */
  Ravel.modules = function(basePath) {
    if (!fs.lstatSync(basePath).isDirectory()) {
      throw new Ravel.ApplicationError.IllegalValue(
        'Base module scanning path \'' + basePath + '\' is not a directory.');
    } else {
      var files = recursive(basePath);
      for (var i=0;i<files.length;i++) {
        if (path.extname(files[i]) === '.js') {
          Ravel.module(path.join(basePath, files[i]));
        }
      }
    }
  };
};
