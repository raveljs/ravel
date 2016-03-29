'use strict';

/**
 * Defines Symbols for auth/, concealing private variables shared between Ravel source files
 */
module.exports = class {
  static get authconfig() { return Symbol.for('@authconfig'); }
  static get authConfigModule() { return Symbol.for('_authConfigModule'); }
};
