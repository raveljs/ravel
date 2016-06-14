'use strict';

const recursive = require('fs-readdir-recursive');
const fs = require('fs');
const upath = require('upath');

/*!
 * Simple, recursive directory scanning for resources to make it easier to register lots of them via `Ravel.resource`
 * @external Ravel
 */
module.exports = function(Ravel) {
  /**
   * Recursively register `Resource`s with Ravel (see [core/resource](resource.js.html))
   *
   * @memberof Ravel
   * @param {String} basePath the directory to start scanning recursively for .js files
   * @example
   *   // recursively load all Resources in a directory
   *   app.resources('./resources');
   */
  Ravel.prototype.resources = function(basePath) {
    if (!fs.lstatSync(basePath).isDirectory()) {
      throw new this.ApplicationError.IllegalValue(
        'Base resource scanning path \'' + basePath + '\' is not a directory.');
    } else {
      const files = recursive(basePath);
      for (let i=0;i<files.length;i++) {
        if (upath.extname(files[i]) === '.js') {
          this.resource(upath.join(basePath, files[i]));
        }
      }
    }
  };
};
