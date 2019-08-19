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
    '^.+\\.jsx?$': 'babel-jest'
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
