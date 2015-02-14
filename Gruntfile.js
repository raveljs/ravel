'use strict';

module.exports = function(grunt) {
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
          colors:true
        },
        src: ['test/**/*.js']
      },
      coverage: {
        options: {
          reporter: 'html-cov',
          quiet: true,
          captureFile: 'test/coverage.html'
        },
        src: ['test/**/*.js']
      }
    },
    open: {
      coverage: {
        path: 'test/coverage.html'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-docco-multi');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-blanket');
  grunt.loadNpmTasks('grunt-open');

  grunt.registerTask('default', ['jshint:lib', 'docco', 'watch']);
  grunt.registerTask('test-cli', [
    'clean:coverage',
    'jshint',
    'blanket',
    'mochaTest:ravel',
    'mochaTest:coverage',
    'clean:coverage'
  ]);
  grunt.registerTask('test', ['test-cli', 'open:coverage']);

};
