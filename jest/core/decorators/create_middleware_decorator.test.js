describe('Ravel', () => {
  const $err = require('../../../lib/util/application_error');
  const Metadata = require('../../../lib/util/meta');
  let createMiddlewareDecorator;

  beforeEach(() => {
    createMiddlewareDecorator = require('../../../lib/ravel').Resource.createMiddlewareDecorator;
  });

  describe('createMiddlewareDecorator()', () => {
    it('should create a named middleware decorator that attaches the named midleware def to decorated classes', () => {
      const test1Decorator = createMiddlewareDecorator('test1');
      @test1Decorator()
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@middlewareDecorators', 'middleware')).toEqual([{
        name: 'test1',
        args: []
      }]);
    });

    it('should create a named middleware decorator that accepts params', () => {
      const myMiddlewareDecorator = createMiddlewareDecorator('my-middleware');
      @myMiddlewareDecorator('val1', { otherParam: true })
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@middlewareDecorators', 'middleware')).toEqual([{
        name: 'my-middleware',
        args: ['val1', { otherParam: true }]
      }]);
    });

    it('should throw an $err.IllegalValue if a non-string type is passed to createMiddlewareDecorator', () => {
      const test = () => {
        createMiddlewareDecorator([]);
      };
      expect(test).toThrow($err.IllegalValue);
    });

    it('should decorate a class with method-specific middleware if a custom middleware decorator is applied to a method', () => {
      const myMiddlewareDecorator = createMiddlewareDecorator('my-middleware');
      class Stub1 {
        @myMiddlewareDecorator('val1', { otherParam: true })
        get () {
        }
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@middlewareDecorators', 'middleware')).toEqual([{
        name: 'my-middleware',
        args: ['val1', { otherParam: true }]
      }]);
    });

    it('should decorate a class with multiple middleware info in order of decorator usage', () => {
      const myMiddlewareDecorator1 = createMiddlewareDecorator('my-middleware1');
      const myMiddlewareDecorator2 = createMiddlewareDecorator('my-middleware2');
      @myMiddlewareDecorator1('val1', { otherParam1: true })
      @myMiddlewareDecorator2('val2', { otherParam2: true })
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@middlewareDecorators', 'middleware')).toEqual([{
        name: 'my-middleware1',
        args: ['val1', { otherParam1: true }]
      }, {
        name: 'my-middleware2',
        args: ['val2', { otherParam2: true }]
      }]);
    });

    it('should decorate a class method with multiple middleware info in order of decorator usage', () => {
      const myMiddlewareDecorator1 = createMiddlewareDecorator('my-middleware1');
      const myMiddlewareDecorator2 = createMiddlewareDecorator('my-middleware2');
      class Stub1 {
        @myMiddlewareDecorator1('val1', { otherParam1: true })
        @myMiddlewareDecorator2('val2', { otherParam2: true })
        get () {
        }
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@middlewareDecorators', 'middleware')).toEqual([{
        name: 'my-middleware1',
        args: ['val1', { otherParam1: true }]
      }, {
        name: 'my-middleware2',
        args: ['val2', { otherParam2: true }]
      }]);
    });
  });
});
