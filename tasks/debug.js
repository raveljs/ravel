/*
 * Borrowed from grunt-debug-task, cut some cruft
 * https://github.com/romario333/grunt-debug-task
 *
 * Copyright (c) 2013 Roman Masek
 * Licensed under the MIT license.
 */

'use strict';

var fork = require('child_process').fork;
var spawn = require('child_process').spawn;
var path = require('path');

module.exports = function(grunt) {
  grunt.registerTask('debug', 'Easily debug your Grunt tasks with node-inspector.', function() {
    var done = this.async();

    // remove any scheduled tasks as we will run them in another process
    grunt.task.clearQueue();

    // take tasks after debug and run them in new process with --debug-brk
    var gruntModule = process.argv[1];
    var args = process.argv.slice(2).filter(function(arg) {return arg !== 'debug';});
    grunt.log.writeln(gruntModule + ' ' + args.join(' '));
    var debugProcess = fork(gruntModule, args, {execArgv: ['--debug-brk']});
    debugProcess.on('exit', function(code) {
      if (nodeInspectorProcess) {
        nodeInspectorProcess.kill();
      }

      done(code === 0);
    });

    // determine node-inspector script path
    // append ".cmd" extension for windows platform
    var nodeInspectorPath = path.join(__dirname, '../node_modules/.bin/node-inspector');
    if (process.platform.indexOf('win') === 0) {
      nodeInspectorPath += '.cmd';
    }

    // start node-inspector
    // TODO: use fork instead of spawn?
    var nodeInspectorProcess = spawn(nodeInspectorPath);
    nodeInspectorProcess.stdout.pipe(process.stdout);
    nodeInspectorProcess.stderr.pipe(process.stderr);
  });
};
