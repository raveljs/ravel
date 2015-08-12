'use strict';

/**
 * Simple, recursive directory scanning for resources
 * to make it easier to register lots of them via
 * Ravel.resource
 */

var recursive = require('fs-readdir-recursive');
var fs = require('fs');
var upath = require('upath');

module.exports = function(Ravel) {
  /**
   * Recursively register resources with Ravel (see core/resource)
   *
   * @param {String} basePath the directory to start scanning recursively for .js files
   */
  Ravel.resources = function(basePath) {
    if (!fs.lstatSync(basePath).isDirectory()) {
      throw new Ravel.ApplicationError.IllegalValue(
        'Base resource scanning path \'' + basePath + '\' is not a directory.');
    } else {
      var files = recursive(basePath);
      for (var i=0;i<files.length;i++) {
        if (upath.extname(files[i]) === '.js') {
          Ravel.resource(upath.join(basePath, files[i]));
        }
      }
    }
  };
};
