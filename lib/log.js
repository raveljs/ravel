/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

var cluster = require('cluster');

module.exports = function(source) {
  return {
      i: function(message) {
        if (process.env.VERBOSE) {
          console.info(source + ': ' + message);
        }
      },
      l: function(message) {
        if (process.env.VERBOSE) {
          console.log(source + ': ' + message);
        }
      },
      w: function(message) {
        if (process.env.VERBOSE) {
          console.warn(source + ': ' + message);
        }
      },
      e: function(message) {
        if (process.env.VERBOSE) {
          console.error(source + ': ' + message);
        }
      }
  };
};
