'use strict';

/**
 * Defines Symbols for db/, concealing private variables shared between Ravel source files
 */
module.exports = class {
  // methods
  static get databaseProviderInit() { return Symbol.for('_databaseProviderInit'); }
};
