'use strict';

module.exports = class {
  static get beforeGlobalMiddleware() { return Symbol.for('_globalMiddleware'); }
  static get beforeMethodMiddleware() { return Symbol.for('_methodlMiddleware'); }
};
