describe('Ravel', () => {
  let Ravel, app;
  beforeEach(() => {
    jest.resetModules();
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('keygrip keys', ['abc']);
    app.set('log level', app.$log.NONE);
  });
  // Testing how Ravel loads modules
  describe('load', () => {
    describe('@Module', () => {
      it('should register modules for instantiation and initialization in Ravel.init', async () => {
        const spy = jest.fn();
        @Ravel.Module('test')
        class Test {
          method () {
            spy();
          }
        }
        app.load(Test);
        await app.init();
        expect(app.module('test')).toBeDefined();
        app.module('test').method();
        expect(spy).toHaveBeenCalled();
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a module without a name', async () => {
        @Ravel.Module
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.$err.IllegalValue);
      });

      it('should throw a Ravel.$err.DuplicateEntry error when clients attempt to register multiple modules with the same name', () => {
        @Ravel.Module('test')
        class Test {}
        @Ravel.Module('test')
        class Test2 {}
        expect(() => app.load(Test, Test2)).toThrowError(app.$err.DuplicateEntry);
      });

      it('should throw a Ravel.$err.IllegalValue error when clients attempt to register a module without appropriate decoration', async () => {
        class Test {}
        expect(() => app.load(Test)).toThrowError(app.$err.IllegalValue);
      });

      it('should load and instantiate modules, performing dependency injection of core services', async () => {
        @Ravel.Module('test')
        @Ravel.inject('$app', '$err', '$log', '$kvstore', '$params', '$db')
        class Test {
          constructor ($app, $err, $log, $kvstore, $params, $db) {
            this.$app = $app;
            this.$err = $err;
            this.$log = $log;
            this.$kvstore = $kvstore;
            this.$params = $params;
            this.$db = $db;
          }
        }
        app.load(Test);
        await app.init();
        const instance = app.module('test');
        expect(instance).toBeDefined();
        expect(instance.$app).toEqual(app);
        expect(instance.$err).toEqual(app.$err);
        expect(instance.$log).toBeDefined();
        expect(instance.$log).toHaveProperty('trace');
        expect(instance.$log).toHaveProperty('verbose');
        expect(instance.$log).toHaveProperty('debug');
        expect(instance.$log).toHaveProperty('info');
        expect(instance.$log).toHaveProperty('warn');
        expect(instance.$log).toHaveProperty('error');
        expect(instance.$log).toHaveProperty('critical');
        expect(instance.$kvstore).toEqual(app.$kvstore);
        expect(instance.$params).toBeDefined();
        expect(instance.$params).toHaveProperty('get');
        expect(instance.$db).toHaveProperty('scoped');
      });

      it('should load and instantiate modules which support dependency injection of other modules', async () => {
        const spy1 = jest.fn();
        const spy2 = jest.fn();
        @Ravel.Module('stub1')
        class Stub1 {
          constructor () {
            spy1();
          }
        }
        @Ravel.inject('stub1')
        @Ravel.Module('stub2')
        class Stub2 {
          constructor (stub1) {
            this.stub1 = stub1;
            spy2();
          }
        }
        app.load(Stub1, Stub2);
        await app.init();
        expect(spy1).toHaveBeenCalled;
        expect(spy2).toHaveBeenCalled;
        expect(app.module('stub2').stub1).toEqual(app.module('stub1'));
      });

      it('should not allow client modules to depend on themselves', async () => {
        @Ravel.inject('stub1')
        @Ravel.Module('stub1')
        class Stub1 {}
        app.load(Stub1);
        await expect(app.init()).rejects.toThrowError(app.$err.General);
      });

      it('should instantiate modules in dependency order', async () => {
        const order = [];
        @Ravel.Module('stub1')
        class Stub1 {
          constructor () {
            order.push(1);
          }
        }

        @Ravel.inject('stub1', 'stub4')
        @Ravel.Module('stub2')
        class Stub2 {
          constructor (stub1, stub4) {
            order.push(2);
          }
        }

        @Ravel.inject('stub2')
        @Ravel.Module('stub3')
        class Stub3 {
          constructor (stub2) {
            order.push(3);
          }
        }

        @Ravel.inject('stub1')
        @Ravel.Module('stub4')
        class Stub4 {
          constructor (stub1) {
            order.push(4);
          }
        }
        app.load(Stub1, Stub2, Stub3, Stub4);
        await app.init();
        expect(order.length).toEqual(4);
        expect(order).toEqual(expect.arrayContaining([1, 4, 2, 3]));
      });

      it('should detect basic cyclical dependencies between client modules', async () => {
        @Ravel.inject('test2')
        @Ravel.Module('test')
        class Stub1 {}
        @Ravel.inject('test')
        @Ravel.Module('test2')
        class Stub2 {}
        app.load(Stub1, Stub2);
        await expect(app.init()).rejects.toThrowError(app.$err.General);
      });

      it('should detect complex cyclical dependencies between client modules', async () => {
        @Ravel.Module('test')
        class Stub1 {}
        @Ravel.inject('test', 'test4')
        @Ravel.Module('test2')
        class Stub2 {}
        @Ravel.inject('test2')
        @Ravel.Module('test3')
        class Stub3 {}
        @Ravel.inject('test3')
        @Ravel.Module('test4')
        class Stub4 {}
        app.load(Stub1, Stub2, Stub3, Stub4);
        await expect(app.init()).rejects.toThrowError(app.$err.General);
      });

      it('should load and instantiate modules which support dependency injection of npm modules', async () => {
        @Ravel.Module('test')
        @Ravel.inject('some-npm-module')
        class Stub1 {
          constructor (some) {
            this.some = some;
          }
        }
        const someMock = {};
        jest.doMock('some-npm-module', () => someMock, { virtual: true });
        app.load(Stub1);
        await app.init();
        expect(app.module('test').some).toEqual(someMock);
      });

      it('should support array notation for specifying npm dependencies which use bad js function names', async () => {
        @Ravel.Module('test')
        @Ravel.inject('bad.name')
        class Stub1 {
          constructor (badName) {
            this.badName = badName;
          }
        }
        const someMock = {};
        jest.doMock('bad.name', () => someMock, { virtual: true });
        app.load(Stub1);
        await app.init();
        expect(app.module('test').badName).toEqual(someMock);
      });

      it('should throw an $err.NotFound when a module attempts to inject an unknown module/npm dependency', async () => {
        @Ravel.Module('test')
        @Ravel.inject(`${Math.random()}`)
        class Stub1 {}
        app.load(Stub1);
        await expect(app.init()).rejects.toThrowError(app.$err.NotFound);
      });

      it('should perform dependency injection on module factories which works regardless of the order of specified dependencies', async () => {
        @Ravel.Module('test')
        @Ravel.inject('first', 'second')
        class Stub1 {
          constructor (first, second) {
            this.first = first;
            this.second = second;
          }
        }

        @Ravel.Module('test2')
        @Ravel.inject('second', 'first')
        class Stub2 {
          constructor (second, first) {
            this.second = second;
            this.first = first;
          }
        }
        jest.doMock('first', () => Object.create(null), { virtual: true });
        jest.doMock('second', () => Object.create(null), { virtual: true });

        app.load(Stub1, Stub2);
        await app.init();
        expect(app.module('test').first).toEqual(app.module('test2').first);
        expect(app.module('test').second).toEqual(app.module('test2').second);
      });

      it('should support injecting the same instance of a module into all modules which reference it', async () => {
        @Ravel.Module('test')
        class Stub1 {}
        @Ravel.inject('test')
        @Ravel.Module('test2')
        class Stub2 {
          constructor (test) {
            this.test = test;
          }
        }
        @Ravel.inject('test')
        @Ravel.Module('test3')
        class Stub3 {
          constructor (test) {
            this.test = test;
          }
        }

        app.load(Stub1, Stub2, Stub3);
        await app.init();
        expect(app.module('test2').test).toEqual(app.module('test3').test);
      });
    });
  });
});
