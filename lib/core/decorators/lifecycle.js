'use strict';

const Metadata = require('../../util/meta');

/**
 * Method-level lifecycle decorators for Module methods,
 * so that they become listeners for Ravel lifecycle events.
 * Made available through the Module class.
 * See [`Module`](#module) for more information.
 *
 * @private
 */
module.exports = {
  /**
   * Methods decorated with `@postinit` will fire after Ravel.init().
   *
   * @param {Class} target - Decorator implementation detail (ignore).
   * @param {string} key - Decorator implementation detail (ignore).
   * @param {Object} descriptor - Decorator implementation detail (ignore).
   * @example
   * const Module = require('ravel').Module;
   * const postinit = Module.postinit;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;postinit
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  postinit: function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@postinit', key, descriptor.value);
  },

  /**
   * Methods decorated with `@prelisten` will fire at the beginning of Ravel.listen().
   *
   * @param {Class} target - Decorator implementation detail (ignore).
   * @param {string} key - Decorator implementation detail (ignore).
   * @param {Object} descriptor - Decorator implementation detail (ignore).
   * @example
   * const Module = require('ravel').Module;
   * const prelisten = Module.prelisten;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;prelisten
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  prelisten: function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@prelisten', key, descriptor.value);
  },

  /**
   * Methods decorated with `@koaconfig` will fire after Ravel has set up `koa`
   * with all of its core global middleware (such as for error handling and
   * authentication/authorization) but *before* any `Routes` or `Resource`
   * classes are loaded. Ravel is intentionally conservative with global
   * middleware to keep your routes as computationally efficient as possible.
   * It is *highly* recommended that Ravel apps follow the same heuristic,
   * declaring middleware in `Routes` or `Resource` classes at the class or
   * method level (as necessary). If, however, global middleware is desired,
   * `@koaconfig` provides the appropriate hook for configuration.
   *
   * @param {Class} target - Decorator implementation detail (ignore).
   * @param {string} key - Decorator implementation detail (ignore).
   * @param {Object} descriptor - Decorator implementation detail (ignore).
   * @example
   * const Module = require('ravel').Module;
   * const postlisten = Module.postlisten;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;koaconfig
   *   configureKoa(koaApp) { // a reference to the internal koa app object
   *     //...
   *   }
   * }
   */
  koaconfig: function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@koaconfig', key, descriptor.value);
  },

  /**
   * Methods decorated with `@postlisten` will fire at the end of Ravel.listen().
   *
   * @param {Class} target - Decorator implementation detail (ignore).
   * @param {string} key - Decorator implementation detail (ignore).
   * @param {Object} descriptor - Decorator implementation detail (ignore).
   * @example
   * const Module = require('ravel').Module;
   * const postlisten = Module.postlisten;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;postlisten
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  postlisten: function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@postlisten', key, descriptor.value);
  },

  /**
   * Methods decorated with `@preclose` will fire at the beginning of Ravel.close().
   *
   * @param {Class} target - Decorator implementation detail (ignore).
   * @param {string} key - Decorator implementation detail (ignore).
   * @param {Object} descriptor - Decorator implementation detail (ignore).
   * @example
   * const Module = require('ravel').Module;
   * const preclose = Module.preclose;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;preclose
   *   doSomething () {
   *     //...
   *   }
   * }
   */
  preclose: function (target, key, descriptor) {
    Metadata.putClassMeta(target, '@preclose', key, descriptor.value);
  },

  /**
   * Methods decorated with `@interval` will fire at the end of Ravel.listen(),
   * and continue firing at the specified interval until Ravel.close().
   *
   * @param {number} interval - The interval to repeat this handler at (in milliseconds).
   * @example
   * const Module = require('ravel').Module;
   * const interval = Module.interval;
   * // &#64;Module('mymodule')
   * class MyModule {
   *   // &#64;interval(1000)
   *   doSomething () {
   *     //...repeat every 1000 ms
   *   }
   * }
   */
  interval: function (interval) {
    return function (target, key, descriptor) {
      Metadata.putClassMeta(target, '@interval', key, {
        handler: descriptor.value,
        interval: interval
      });
    };
  }
};
