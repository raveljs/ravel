'use strict';

/**
 * Defines Symbols for auth/, concealing private variables shared between Ravel source files
 */
module.exports = {
  authconfig: Symbol.for('@authconfig'),
  authConfigModule: Symbol.for('_authConfigModule')
};
