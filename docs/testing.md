Testing a Ravel application is a relatively simple exercise with any popular testing framework, such as [jest](https://facebook.github.io/jest) (which Ravel uses for its own internal test suite).

Much as with running the application, you will need a `.babelrc` file to transpile decorators:

*.babelrc*
```js
{
  "retainLines": true,
  "env": {
    "test": {
      "plugins": ["transform-decorators-legacy"]
    }
  }
}
```

Having done so, bootstrap your application the same way you run it:

```js
describe('Some test', () => {
  let app;
  beforeEach(() => async () => {
    const Ravel = new require('ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']); // required parameter
    app.set('log level', app.log.NONE); // if you want to silence logging
    // load your app components
    app.scan('../src/modules', '../src/resources', '../src/routes');
    await app.init();
  });
});
```

### Testing Modules

Let's assume you have a `Module` with an injection name `'mymodule'` (either inferred from its filename or named manually via `@Module`). This `Module` can be accessed directly for testing after `app.init()` via `app.module('mymodule')`:

```js
it('should do something', () => {
  const m = app.module('mymodule');
  expect(typeof m.method).toBe('function');
  expect(m.method()).toBe(true);
});
```

### Testing Resources and Routes

Much like testing `Module`s, `Resource`s and `Routes` can be accessed directly for unit testing via `app.resource(basePath)` and `app.routes(basePath)`, where `basePath` is the string passed to the `@Routes` or `@Resource` decorator.

A more savvy approach to testing your endpoints, however, is to leverage [supertest](https://github.com/visionmedia/supertest) to make and validate real requests against your API:

```js
const request = require('supertest');
it('should respond in some way', async () => {
  // pass app.callback or app.server to supertest to give it access to your endpoints
  const res = await request(app.callback).get('/my/endpoint');
  expect(res.status).toBe(200);
});
```

### Testing in Isolation

If you wish to test an individual `Module`, `Resource` or `Routes` class without bootstrapping your entire application, you can leverage `app.load()` to load or mock components:

```js
beforeEach(() => async () => {
    const Ravel = new require('ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']); // required parameter
    app.set('log level', app.log.NONE); // if you want to silence logging
    // You want to test IsolatedModule, which depends on AnotherModule
    const IsolatedModule = require('../src/path/to/module');
    // You can either require AnotherModule, or use a mock:
    @Ravel.Module('anothermodule')
    class AnotherModule {
      // mocked methods
    }
    // load your app components
    app.load(IsolatedModule, AnotherModule);
    await app.init();
  });
```
