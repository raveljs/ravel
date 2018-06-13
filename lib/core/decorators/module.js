'use strict';

const Metadata = require('../../util/meta');

/**
 * `Module`s are plain old node.js modules exporting a single class which encapsulates
 * application logic and middleware. `Module`s support dependency injection of core Ravel
 * services and other `Module`s alongside npm dependencies *(no relative `require`'s!)*.
 * `Module`s are instantiated safely in dependency-order, and cyclical
 * dependencies are detected automatically.
 *
 * @param {any[]} args - Either a single string name for this module, or no arguments.
 *
 * @example
 * const inject = require('ravel').inject;
 * const Module = require('ravel').Module;
 *
 * // &#64;Module
 * // &#64;inject('path', 'fs', 'custom-module', '$log')
 * class MyModule {
 *   constructor (path, fs, custom, $log) {
 *     this.path = path;
 *     this.fs = fs;
 *     this.custom = custom;
 *     this.$log = $log;
 *   }
 *
 *   aMethod () {
 *     this.$log.info('In aMethod!');
 *     //...
 *   }
 * }
 *
 * module.exports = MyModule
 */
const Module = function (...args) {
  if (args.length === 1 && typeof args[0] === 'string') {
    return function (target, key, descriptor) {
      Metadata.putClassMeta(target.prototype, '@role', 'type', 'Module');
      if (typeof name === 'string') {
        Metadata.putClassMeta(target.prototype, '@role', 'name', args[0]);
      }
    };
  } else {
    Metadata.putClassMeta(args[0].prototype, '@role', 'type', 'Module');
  }
};

/*!
 * Populates a class with a static reference to the // &#64;Module role decorator
 */
module.exports = Module;
