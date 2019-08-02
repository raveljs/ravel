module.exports = {
  'setupFiles': [
    './jest/setup.js'
  ],
  'setupFilesAfterEnv': ['./jest/timeout.js'],
  'moduleFileExtensions': [
    'js'
  ],
  'moduleDirectories': [
    'node_modules'
  ],
  'transform': {
    '^.+\\.jsx?$': require.resolve('babel-jest') // force babel 6
  },
  'collectCoverage': true,
  'collectCoverageFrom': [
    'lib/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  'coverageReporters': [
    'json',
    'lcov',
    'text',
    'html'
  ]
};
