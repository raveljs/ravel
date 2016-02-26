'use strict';

/**
 * Defines Symbols for util/, concealing private variables shared between Ravel source files
 */
module.exports = class {
  static get beforeGlobalMiddleware() { return Symbol.for('_globalMiddleware'); }
  static get beforeMethodMiddleware() { return Symbol.for('_methodlMiddleware'); }
};
