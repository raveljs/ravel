'use strict';

// koa-bodyparser doesn't transpile its dist :(
if (process.version < 'v7.6.0') {
  require('babel-register')({
    ignore: false,
    only: /koa-bodyparser|koa-static|koa-send|koa-session/,
    plugins: ['transform-decorators-legacy', 'transform-async-to-generator']
  });
}

const gulp = require('gulp');
const plugins = require('gulp-load-plugins')();
// const isparta = require('isparta')
const del = require('del');
const exec = require('child_process').exec;

const TESTS = [
  'test-dist/test/core/decorators/test-*.js',
  'test-dist/test/core/test-*.js',
  'test-dist/test/db/test-*.js',
  'test-dist/test/db/decorators/test-*.js',
  'test-dist/test/util/test-*.js',
  'test-dist/test/auth/test-*.js',
  'test-dist/test/auth/decorators/test-*.js',
  'test-dist/test/ravel/test-*.js',
  'test-dist/test/**/test-*.js'
];

const babelConfig = {
  'retainLines': true
};
const MOCHA_OPTS = {
  reporter: 'spec',
  quiet: false,
  colors: true,
  timeout: 10000
};

if (process.version < 'v7.6.0' || process.execArgv.indexOf('test')) {
  console.log('Transpiling async/await...');
  babelConfig.plugins = ['transform-decorators-legacy', 'transform-async-to-generator'];
} else {
  console.log('Using native async/await...');
  babelConfig.plugins = ['transform-decorators-legacy'];
}

if (process.execArgv.indexOf('--inspect') >= 0 || process.execArgv.indexOf('--debug') >= 0) {
  console.log('Using unlimited test timeouts...');
  delete MOCHA_OPTS.timeout;
  MOCHA_OPTS.enableTimeouts = false;
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
    'reports', 'docs', 'test-dist'
  ]);
});

gulp.task('cover-lib', ['transpile-lib'], function () {
  return gulp.src(['./test-dist/lib/**/*.js'])
    .pipe(plugins.istanbul({
      //  instrumenter: isparta.Instrumenter,
      includeUntested: true
    }))
    .pipe(plugins.istanbul.hookRequire());
});

gulp.task('copy-lib', ['clean', 'lint'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(gulp.dest('test-dist/lib'));
});

gulp.task('dist', ['clean'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(plugins.babel(babelConfig))
    .pipe(gulp.dest('dist'));
});

gulp.task('transpile-lib', ['clean', 'lint'], function () {
  return gulp.src('lib/**/*.js')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel(babelConfig))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('test-dist/lib'));
});

gulp.task('transpile-tests', ['clean', 'lint'], function () {
  return gulp.src('test/**/*.js')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel(babelConfig))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('test-dist/test'));
});

// necessary to locate issues in code, due to https://github.com/gotwarlost/istanbul/issues/274
gulp.task('test-no-cov', ['copy-lib', 'transpile-tests'], function () {
  const env = plugins.env.set({
    LOG_LEVEL: 'critical',
    NODE_ENV: 'testing'
  });
  return gulp.src(TESTS)
    .pipe(env)
    .pipe(plugins.mocha(MOCHA_OPTS))
    .pipe(env.reset)
    .once('error', function () {
      process.exit(1);
    })
    .once('end', function () {
      process.exit();
    });
});

gulp.task('test', ['cover-lib', 'transpile-tests'], function () {
  const env = plugins.env.set({
    LOG_LEVEL: 'critical',
    NODE_ENV: 'testing'
  });
  return gulp.src(TESTS)
    .pipe(env)
    .pipe(plugins.mocha(MOCHA_OPTS))
    // Creating the reports after tests ran
    .pipe(plugins.istanbul.writeReports({
      dir: './reports',
      reporters: ['lcov', 'json', 'text', 'text-summary', 'html']
    }))
    // Enforce a coverage of at least 100%
    // .pipe(plugins.istanbul.enforceThresholds({ thresholds: { global: 100 } }))
    .pipe(env.reset)
    .once('error', function () {
      process.exit(1);
    })
    .once('end', function () {
      process.exit();
    });
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
