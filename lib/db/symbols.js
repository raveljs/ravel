'use strict';

module.exports = class {
  // methods
  static get databaseProviderInit() { return Symbol.for('_databaseProviderInit'); }
};
