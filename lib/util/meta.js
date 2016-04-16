'use strict';

const sMeta = Symbol.for('_metadata');

/**
 * Facilitates accessing andstoring metadata, generally
 * created by decorators, safely within a class's prototype.
 */
module.exports = class Metadata {
  /**
   * Gets or creates a metadata object for a class
   * @param target {Class} a class
   * @return {Object} the metadata object for the given class
   */
  static getMeta(target) {
    if (typeof target[sMeta] !== 'object') {
      target[sMeta] = Object.create(null);
      target[sMeta].class = Object.create(null);
      target[sMeta].method = Object.create(null);
    }
    return target[sMeta];
  }

  /**
   * Gets the class-level metadata for a class
   * @param target {Class} a class
   * @param category {String} a category
   * @return {Object} the class-level metadata object for the given class
   */
  static getClassMeta(target, category) {
    const classMeta = Metadata.getMeta(target).class;
    if (typeof classMeta[category] !== 'object') {
      classMeta[category] = Object.create(null);
    }
    return classMeta[category];
  }

  /**
   * Gets the class-level metadata value for a class and a key
   * @param target {Class} a class
   * @param category {String} a category
   * @param key {String} the key to get within the metadata category
   * @param defaultValue {Any | undefined} return this value if the given key is not set
   * @return {Object} the class-level metadata object for the given class
   */
  static getClassMetaValue(target, category, key, defaultValue) {
    const classMeta = Metadata.getClassMeta(target, category);
    return classMeta[key] ? classMeta[key] : defaultValue;
  }

  /**
   * Gets the class-level metadata for a class
   * @param target {Class} a class
   * @param method {String} the method name
   * @param category {String} a category
   * @return {Object} the class-level metadata object for the given class
   */
  static getMethodMeta(target, method, category) {
    const methodMeta = Metadata.getMeta(target).method;
    if (typeof methodMeta[method] !== 'object') {
      methodMeta[method] = Object.create(null);
    }
    if (typeof methodMeta[method][category] !== 'object') {
      methodMeta[method][category] = Object.create(null);
    }
    return methodMeta[method][category];
  }

  /**
   * Gets the class-level metadata value for a class and a key
   * @param target {Class} a class
   * @param method {String} the method name
   * @param category {String} a category
   * @param key {String} the key to get within the metadata category
   * @param defaultValue {Any | undefined} return this value if the given key is not set
   * @return {Object} the class-level metadata object for the given class
   */
  static getMethodMetaValue(target, method, category, key, defaultValue) {
    const methodMeta = Metadata.getMethodMeta(target, method, category);
    return methodMeta[key] ? methodMeta[key] : defaultValue;
  }

  /**
   * Add or modify class-level metadata
   * @param target {Class} a class
   * @param category {String} a category
   * @param key {String} the key to set within the metadata category
   * @param value {Any} the value to set at the given key
   */
  static putClassMeta(target, category, key, value) {
    const catMap = Metadata.getClassMeta(target, category);
    catMap[key] = value;
  }

  /**
   * Add or modify method-level metadata
   * @param target {Class} a class
   * @param method {String} the method name
   * @param category {String} a category
   * @param key {String} the key to set within the metadata category
   * @param value {Any} the value to set at the given key
   */
  static putMethodMeta(target, method, category, key, value) {
    const catMap = Metadata.getMethodMeta(target, method, category);
    catMap[key] = value;
  }
};
