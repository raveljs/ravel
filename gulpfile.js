'use strict';

// koa-bodyparser doesn't transpile its dist :(
if (process.version < 'v7.6.0') {
  console.log('Transpiling decorators and async/await in node_modules');
  require('babel-register')({
    ignore: false,
    only: /koa-bodyparser|koa-static|koa-send|koa-session/,
    plugins: ['transform-decorators-legacy', 'transform-async-to-generator']
  });
}

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
const del = require('del');
const exec = require('child_process').exec;

const babelConfig = {
  'retainLines': true
};

if (process.execArgv.indexOf('test')) {
  console.log('Transpiling async/await...');
  babelConfig.plugins = ['transform-decorators-legacy', 'istanbul'];
} else {
  console.log('Using native async/await...');
  babelConfig.plugins = ['transform-decorators-legacy'];
}

gulp.task('lint', function () {
  return gulp.src(['./lib/**/*.js', './test/**/*.js', 'gulpfile.js'])
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.format())
    .pipe(plugins.eslint.failAfterError());
});

gulp.task('docs', function (done) {
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
});

gulp.task('clean', function () {
  return del([
    'coverage', 'docs', 'test-dist'
  ]);
});

gulp.task('dist', ['clean'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(plugins.babel(babelConfig))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['lint', 'docs'], function () {
  gulp.watch(['README.md', './lib/**/*.js', './docs/**/*.md', 'documentation.yml', './documentation_theme/**'], ['lint', 'docs']);
  gulp.watch(['gulpfile.js', './test/**/*.js'], ['lint']);
});

gulp.task('show-coverage', function () {
  return gulp.src('./reports/index.html')
    .pipe(plugins.open());
});

gulp.task('default', ['watch']);
