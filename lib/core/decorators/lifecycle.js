'use strict';

const Metadata = require('../../util/meta');

/**
 * Method-level lifecycle decorators for Module methods,
 * so that they become listeners for Ravel lifecycle events.
 * Made available through the Module class.
 * See [core/module](../module.js.html) for more information.
 */
module.exports = {
  /**
   * Methods decorated with `@postinit` will fire after Ravel.init()
   * @example
   *   const Module = require('ravel').Module;
   *   const postinit = Module.postinit;
   *   class MyModule extends Module {
   *     &#64;postinit
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  postinit: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@postinit', key, descriptor.value);
  },

  /**
   * Methods decorated with `@prelisten` will fire at the beginning of Ravel.listen()
   * @example
   *   const Module = require('ravel').Module;
   *   const prelisten = Module.prelisten;
   *   class MyModule extends Module {
   *     &#64;prelisten
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  prelisten: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@prelisten', key, descriptor.value);
  },

  /**
   * Methods decorated with `@postlisten` will fire at the end of Ravel.listen()
   * @example
   *   const Module = require('ravel').Module;
   *   const postlisten = Module.postlisten;
   *   class MyModule extends Module {
   *     &#64;postlisten
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  postlisten: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@postlisten', key, descriptor.value);
  },

  /**
   * Methods decorated with `@preclose` will fire at the beginning of Ravel.close()
   * @example
   *   const Module = require('ravel').Module;
   *   const preclose = Module.preclose;
   *   class MyModule extends Module {
   *     &#64;preclose
   *     doSomething() {
   *       //...
   *     }
   *   }
   */
  preclose: function(target, key, descriptor) {
    Metadata.putClassMeta(target, '@preclose', key, descriptor.value);
  }
};
