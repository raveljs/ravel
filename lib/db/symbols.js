'use strict';

/**
 * Defines Symbols for db/, concealing private variables shared between Ravel source files
 */
module.exports = {
  // methods
  databaseProviderInit: Symbol.for('_databaseProviderInit')
};
