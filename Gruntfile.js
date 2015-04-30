'use strict';

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  var tests = [
    'test/core/test-*.js',
    'test/db/test-*.js',
    'test/util/test-*.js',
    'test/auth/test-*.js',
    'test/ws/test-*.js',
    'test/ravel/test-*.js',
    'test/**/test-*.js'
  ];

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: {
        src: ['Gruntfile.js']
      },
      options: {
        force: true,
        reporter:  require('jshint-stylish'),
        jshintrc: true,
        ignores: ['node_modules/**', 'sample/**', 'docs/**', 'lib-cov']
      },
      lib: {
        files: {
          src: ['lib/**/*.js']
        }
      },
      test: {
        files: {
          src: ['test/**/*.js']
        }
      }
    },
    docco: {
      options: {
        layout: 'parallel'
      },
      api: {
        files: {
          src: ['ravel.js', 'lib/**']
        }
      }
    },
    watch: {
      api: {
        files: ['Gruntfile.js', 'lib/**', 'ravel.js'],
        tasks: ['jshint', 'docco'],
        options: {
          spawn: false
        }
      }
    },
    clean: {
      'coverage': ['lib-cov'],
      'docs': ['docs']
    },
    env : {
      options : {
        add: {
          LOG_LEVEL: 'trace'
        }
      },
      test : {
        LOG_LEVEL : 'critical'
      }
    },
    blanket: {
      coverage: {
        src: ['ravel.js', 'lib/'],
        dest: 'lib-cov/'
      },
      options: {
        'data-cover-flags':true
      }
    },
    mochaTest: {
      ravel: {
        options: {
          reporter: 'spec',
          quiet:false,
          colors:true,
          timeout: 10000
        },
        src: tests
      },
      ravelDebug: {
        options: {
          reporter: 'spec',
          quiet:false,
          colors:true,
          timeout:60000
        },
        src: tests
      },
      coverage: {
        options: {
          reporter: 'html-cov',
          quiet: true,
          captureFile: 'test/coverage.html'
        },
        src: tests
      },
      coverageLcov: {
        options: {
          reporter: 'mocha-lcov-reporter',
          quiet: true,
          captureFile: 'test/coverage.lcov'
        },
        src: tests
      }
    },
    coveralls: {
      full: {
        src: 'test/coverage.lcov',
        options: {
          force: true
        }
      }
    },
    open: {
      coverage: {
        path: 'test/coverage.html'
      },
      inspector: {
        path: 'http://127.0.0.1:8080/debug?port=5858'
      }
    }
  });

  grunt.registerTask('default', ['jshint:lib', 'docco', 'watch']);
  grunt.registerTask('test-cli', [
    'env:test',
    'clean:coverage',
    'jshint',
    'blanket',
    'mochaTest:ravel',
    'mochaTest:coverage',
    'mochaTest:coverageLcov',
    'clean:coverage'
  ]);
  grunt.registerTask('test-debug', [
    'env:test',
    'clean:coverage',
    'jshint',
    'blanket',
    'mochaTest:ravelDebug',
    'mochaTest:coverage',
    'mochaTest:coverageLcov',
    'clean:coverage'
  ]);
  grunt.registerTask('test', ['test-cli', 'open:coverage']);
  grunt.registerTask('travis', ['test-cli', 'coveralls']);

};
