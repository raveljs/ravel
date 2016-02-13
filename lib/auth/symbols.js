'use strict';

module.exports = class {
  static get authconfig() { return Symbol.for('@authconfig'); }
  static get authConfigModule() { return Symbol.for('_authConfigModule'); }
};
