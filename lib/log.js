/**
 * Ravel
 * Copyright (c) 2014 Sean McIntyre <s.mcintyre@xverba.ca>
 */

var cluster = require('cluster');

module.exports = function(source) {
  var getClusterNodeName = function() {
    if (cluster.isMaster) {
      return '[MASTER] ';
    } else {
      return '[WORKER '+cluster.worker.id+'] ';
    }
  };
  return {
      i: function(message) {
        if (process.env.VERBOSE) {
          console.info(getClusterNodeName() + source + ': ' + message);
        }
      },
      l: function(message) {
        if (process.env.VERBOSE) {
          console.log(getClusterNodeName() + source + ': ' + message);
        }
      },
      w: function(message) {
        if (process.env.VERBOSE) {
          console.warn(getClusterNodeName() + source + ': ' + message);
        }
      },
      e: function(message) {
        if (process.env.VERBOSE) {
          console.error(getClusterNodeName()+source + ': ' + message);
        }
      }
  };
};
