'use strict';

const $err = require('../util/application_error');

const sMeta = Symbol.for('_metadata');

/**
 * Return true if `target` is a `prototype`.
 *
 * @param  {Any} target - Anything.
 * @throws {IllegalValueError} If and only if `target` was not a class prototype.
 * @private
 */
function isPrototype (target) {
  if (!(typeof target === 'object')) {
    throw new $err.IllegalValue('Must get and set metadata on a class prototype.');
  }
}

/**
 * Facilitates accessing andstoring metadata, generally
 * created by decorators, safely within a class's prototype.
 *
 * @private
 */
class Metadata {
  /**
  * Gets or creates a metadata object for a class.
  *
  * @param {Class} target - A class.
  * @returns {object} The metadata object for the given class.
  * @private
  */
  static getMeta (target) {
    isPrototype(target);
    if (typeof target[sMeta] !== 'object') {
      target[sMeta] = Object.create(null);
      target[sMeta].class = Object.create(null);
      target[sMeta].method = Object.create(null);
    }
    return target[sMeta];
  }

  /**
  * Gets the class-level metadata for a class.
  *
  * @param {Class} target - A class.
  * @param {string} category - A category.
  * @param {Any | undefined} defaultValue - Return this value if the given category does not exist.
  * @returns {object} The class-level metadata object for the given class.
  * @private
  */
  static getClassMeta (target, category, defaultValue) {
    isPrototype(target);
    const classMeta = Metadata.getMeta(target).class;
    return classMeta[category] ? classMeta[category] : defaultValue;
  }

  /**
  * Gets the class-level metadata value for a class and a key.
  *
  * @param {Class} target - A class.
  * @param {string} category - A category.
  * @param {string} key - The key to get within the metadata category.
  * @param {Any | undefined} defaultValue - Return this value if the given category does not exist.
  * @returns {object} The class-level metadata object for the given class.
  * @private
  */
  static getClassMetaValue (target, category, key, defaultValue) {
    isPrototype(target);
    const classMeta = Metadata.getClassMeta(target, category);
    return classMeta && classMeta[key] ? classMeta[key] : defaultValue;
  }

  /**
  * Gets the method-level metadata for a class.
  *
  * @param {Class} target - A class.
  * @param {string} method - The method name.
  * @param {string} category - A category.
  * @param {Any | undefined} defaultValue - Return this value if the given category does not exist.
  * @returns {object} The class-level metadata object for the given class.
  * @private
  */
  static getMethodMeta (target, method, category, defaultValue) {
    isPrototype(target);
    const methodMeta = Metadata.getMeta(target).method;
    return methodMeta[method] ? methodMeta[method][category]
      ? methodMeta[method][category] : defaultValue : defaultValue;
  }

  /**
  * Gets the method-level metadata value for a class and a key.
  *
  * @param {Class} target - A class.
  * @param {string} method - The method name.
  * @param {string} category - A category.
  * @param {string} key - The key to get within the metadata category.
  * @param {Any | undefined} defaultValue - Return this value if the given category does not exist.
  * @returns {object} The class-level metadata object for the given class.
  * @private
  */
  static getMethodMetaValue (target, method, category, key, defaultValue) {
    isPrototype(target);
    const methodMeta = Metadata.getMethodMeta(target, method, category);
    return methodMeta && methodMeta[key] ? methodMeta[key] : defaultValue;
  }

  /**
  * Add or modify class-level metadata.
  *
  * @param {Class} target - A class.
  * @param {string} category - A category.
  * @param {string} key - The key to set within the metadata category.
  * @param {Any} value - The value to set at the given key.
  * @private
  */
  static putClassMeta (target, category, key, value) {
    isPrototype(target);
    const classMeta = Metadata.getMeta(target).class;
    if (typeof classMeta[category] !== 'object') {
      classMeta[category] = Object.create(null);
    }
    classMeta[category][key] = value;
  }

  /**
  * Add or modify method-level metadata.
  *
  * @param {Class} target - A class.
  * @param {string} method - The method name.
  * @param {string} category - A category.
  * @param {string} key - The key to set within the metadata category.
  * @param {Any} value - The value to set at the given key.
  * @private
  */
  static putMethodMeta (target, method, category, key, value) {
    isPrototype(target);
    const methodMeta = Metadata.getMeta(target).method;
    if (typeof methodMeta[method] !== 'object') {
      methodMeta[method] = Object.create(null);
    }
    if (typeof methodMeta[method][category] !== 'object') {
      methodMeta[method][category] = Object.create(null);
    }
    methodMeta[method][category][key] = value;
  }
}

/*!
 * Export Metadata
 */
module.exports = Metadata;
