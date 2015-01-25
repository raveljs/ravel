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
        bitwise:   true,
        eqeqeq:    true,
        curly:     true,
        immed:     true,
        latedef:   true,
        newcap:    true,
        noarg:     true,
        noempty:   true,
        nonbsp:    true,
        nonew:     true,
        sub:       true,
        undef:     true,
        unused:    true,
        boss:      true,
        eqnull:    true,
        node:      true,
        jquery:    true,
        quotmark: 'single',
        camelcase: true,
        strict:    true,
        indent: 2,
        //maxdepth:  4,
        ignores: ['node_modules/**', 'sample/**', 'docs/**', 'lib-cov']
      },
      lib: {
        files: {
          src: ['lib/**/*.js']
        },
        options: {
          globals: {
            Primus: true
          }
        }
      },
      test: {
        files: {
          src: ['test/**/*.js']
        },
        options: {
          '-W030': false,
          globals: {
            describe: false,
            beforeEach: false,
            afterEach: false,
            it: false
          }
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
  grunt.registerTask('test', ['clean:coverage', 'jshint', 'blanket', 'mochaTest:ravel', 'mochaTest:coverage', 'open:coverage', 'clean:coverage']);
};
