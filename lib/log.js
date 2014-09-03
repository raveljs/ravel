/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

module.exports = function(source) {
  return {    
      l: function(message) {
        if (process.env.VERBOSE) {
          console.log(source + ' [VERBOSE]: ' + message);
        }
      },
      i: function(message) {
        if (process.env.VERBOSE || process.env.INFO) {
          console.info(source + ' [INFO]: ' + message);
        }
      },
      w: function(message) {
        if (process.env.VERBOSE || process.env.INFO || process.env.WARNING) {
          console.warn(source + ' [WARNING]: ' + message);
        }
      },
      e: function(message) {
        if (process.env.VERBOSE || process.env.INFO || process.env.WARNING | process.env.ERROR) {
          console.error(source + ' [ERROR]: ' + message);
        }
      }
  };
};
