'use strict';

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const del = require('del');
const exec = require('child_process').exec;

const babelConfig = {
  presets: [
    // {'retainLines': true} // broken in babel 7 with decorators
  ],
  'plugins': [['@babel/plugin-proposal-decorators', { 'legacy': true }]]
};

gulp.task('lint', gulp.series(function lint () {
  return gulp.src(['./lib/**/*.js', './test/**/*.js', 'gulpfile.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
}));

gulp.task('docs', gulp.series(function docs (done) {
  exec(`node ./node_modules/documentation/bin/documentation.js build lib/ravel.js -f html -o docs-dist -c documentation.yml --theme ./documentation_theme`, (err, stdout, stderr) => {
    console.log(stdout);
    console.log(stderr);
    if (err) { done(err); } else {
      gulp.src(['docs-dist/index.html'])
      // fake decorator support
        .pipe(plugins.replace(/<span class="hljs-comment">\/\/\s+&amp;#64;(.*?)<\/span>/g, (match, group1) => {
          return `@${group1.replace(/'(.+?)'/g, '<span class="hljs-string">\'$1\'</span>')}`;
        }))
        .pipe(gulp.dest('docs-dist/'))
        .on('end', done);
    }
  });
}));

gulp.task('clean', gulp.series(function clean () {
  return del([
    'coverage', 'docs-dist', 'test-dist'
  ]);
}));

// TODO broken babel reference
gulp.task('dist', gulp.series('clean', function dist () {
  return gulp.src('lib/**/*.js')
    .pipe(plugins.babel(babelConfig))
    .pipe(gulp.dest('dist'));
}));

gulp.task('watch', gulp.series(gulp.parallel('lint', 'docs'), function watch () {
  gulp.watch(['README.md', './lib/**/*.js', './docs/**/*.md', 'documentation.yml', './documentation_theme/**'], gulp.parallel('lint', 'docs'));
  gulp.watch(['gulpfile.js', './test/**/*.js'], gulp.parallel('lint'));
}));

gulp.task('show-coverage', gulp.series(function showCoverage () {
  return gulp.src('./coverage/lcov-report/index.html')
    .pipe(plugins.open());
}));

gulp.task('show-docs', gulp.series('docs', function showDocs () {
  return gulp.src('./docs-dist/index.html')
    .pipe(plugins.open());
}));

gulp.task('default', gulp.series('watch'));
