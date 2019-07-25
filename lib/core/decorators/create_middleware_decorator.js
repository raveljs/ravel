'use strict';

const $err = require('../../util/application_error');
const Metadata = require('../../util/meta');

/**
 * A factory for creating custom decorators that use associated middleware. The returned
 * decorator can be used on classes or methods and allow passing custom params to the
 * associated middleware before the decorated object is run.
 *
 * A decorator can be used multiple times on the same decorated object, which will add
 * multiple calls to the associated middleware using the passed in params.
 *
 * @param {string} middlewareName - The name of an associated middleware module to lookup and use.
 * @example
 * // Note: decorator works the same way on Routes or Resource classes
 *
 * const Module = require('ravel').Module;
 * const middleware = Module.middleware;
 *
 * // &#64;Module('mymodule')
 * class MyModule {
 *   // &#64;middleware('my-middleware', { acceptsParams: true })
 *   doSomethingMiddleware (...params) {
 *     // ...params refer to the params passed to the associated decorator
 *     return async doSomething (ctx, next) {
 *       //...
 *     };
 *   }
 * }
 *
 * //...
 * const Resource = require('ravel').Resource;
 * const myMiddleWare = Resource.createMiddlewareDecorator('my-middleware');
 * // &#64;Resource('/')
 * class MyResource {
 *   // &#64;myMiddleWare('val1', { someParamInputs: true })
 *   async getAll () {
 *     // doSomething('val', { someParamInputs: true}) will be called before this
 *     //...
 *   }
 * }
 */
function createMiddlewareDecorator (middlewareName) {
  if (typeof middlewareName !== 'string' || middlewareName.length === 0) {
    throw new $err.IllegalValue('Middleware decorator names must be strings used with @middleware.');
  }

  // return the decorator that takes params for the middleware
  return function (...args) {
    return function (target, key) {
      if (key === undefined) {
        // get the existing custom decorator defs array for the class, or create one if it doesn't exist
        let customDecoratorDefs = Metadata.getClassMetaValue(target.prototype, '@middlewareDecorators', 'middleware',
          null);
        if (customDecoratorDefs === null) {
          customDecoratorDefs = [];
          Metadata.putClassMeta(target.prototype, '@middlewareDecorators', 'middleware', customDecoratorDefs);
        }
        // add another middleware usage to the list based on the passed in arguments
        // use reverse order so decorators are run in top down declared order
        customDecoratorDefs.unshift({
          name: middlewareName,
          args: args
        });
      } else {
        // get the existing custom decorator defs array for the method, or create one if it doesn't exist
        let customDecoratorDefs = Metadata.getMethodMetaValue(target, key, '@middlewareDecorators', 'middleware', null);
        if (customDecoratorDefs === null) {
          customDecoratorDefs = [];
          Metadata.putMethodMeta(target, key, '@middlewareDecorators', 'middleware', customDecoratorDefs);
        }
        // add another middleware usage to the list based on the passed in arguments
        // use reverse order so decorators are run in top down declared order
        customDecoratorDefs.unshift({
          name: middlewareName,
          args: args
        });
      }
    };
  };
}

/*!
 * Export the `@middleware` decorator factory
 */
module.exports = createMiddlewareDecorator;
