let app;
let postinjectHandlerCalled = 0;
let anotherPostinjectHandlerCalled = 0;
let postinitHandlerCalled = 0;
let anotherPostinitHandlerCalled = 0;
let prelistenHandlerCalled = 0;
let postlistenHandlerCalled = 0;
let intervalCalled = 0;
let endHandlerCalled = 0;
let koaconfigHandlerCalled = 0;
let koaconfigAppReference;

describe('Ravel lifeycle test', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
    const Ravel = require('../../lib/ravel');
    const inject = Ravel.inject;
    const postinject = Ravel.Module.postinject;
    const postinit = Ravel.Module.postinit;
    const prelisten = Ravel.Module.prelisten;
    const postlisten = Ravel.Module.postlisten;
    const interval = Ravel.Module.interval;
    const preclose = Ravel.Module.preclose;
    const koaconfig = Ravel.Module.koaconfig;
    postinjectHandlerCalled = 0;
    anotherPostinjectHandlerCalled = 0;
    postinitHandlerCalled = 0;
    anotherPostinitHandlerCalled = 0;
    prelistenHandlerCalled = 0;
    postlistenHandlerCalled = 0;
    koaconfigHandlerCalled = 0;
    endHandlerCalled = 0;

    const u = [{ id: 1, name: 'Joe' }, { id: 2, name: 'Jane' }];

    @Ravel.Module('another')
    class Another {
      constructor () {
        this.test = 'hello world';
      }
    }

    // stub Module (business logic container)
    @Ravel.Module('users')
    @Ravel.autoinject('another')
    class Users {
      getAllUsers () {
        return Promise.resolve(u);
      }

      getUser (userId) {
        if (userId < u.length) {
          return Promise.resolve(u[userId - 1]);
        } else {
          return Promise.reject(new this.$err.NotFound('User id=' + userId + ' does not exist!'));
        }
      }

      @postinject
      doPostInject () {
        expect(this.another.test).toBe('hello world');
        postinjectHandlerCalled += 1;
      }

      @postinject
      doAnotherPostInject () {
        expect(this.another.test).toBe('hello world');
        anotherPostinjectHandlerCalled += 1;
      }

      @postinit
      doPostInit () {
        postinitHandlerCalled += 1;
      }

      @postinit
      doAnotherPostInit () {
        anotherPostinitHandlerCalled += 1;
      }

      @prelisten
      doPreListen () {
        prelistenHandlerCalled += 1;
      }

      @postlisten
      doPostListen () {
        postlistenHandlerCalled += 1;
      }

      @interval(1000)
      doInterval () {
        intervalCalled += 1;
      }

      @preclose
      doEnd () {
        endHandlerCalled += 1;
      }

      @koaconfig
      doKoaConfig (koaApp) {
        koaconfigHandlerCalled += 1;
        koaconfigAppReference = koaApp;
      }
    }

    // stub Resource (REST interface)
    const pre = Ravel.Resource.before; // have to alias to @pre instead of proper @before, since the latter clashes with mocha
    @inject('users')
    @Ravel.Resource('/api/user')
    class UsersResource {
      constructor (users) {
        this.users = users;
        this.someMiddleware = async function (ctx, next) { await next(); };
      }

      @pre('someMiddleware')
      async getAll (ctx) {
        ctx.body = await this.users.getAllUsers();
      }

      async get (ctx) {
        ctx.body = await this.users.getUser(ctx.params.id);
      }
    }

    // stub Routes (miscellaneous routes, such as templated HTML content)
    const mapping = Ravel.Routes.mapping;
    @Ravel.Routes('/')
    class TestRoutes {
      @mapping(Ravel.Routes.GET, '/app')
      async handler (ctx) {
        ctx.body = '<!DOCTYPE html><html></html>';
        ctx.status = 200;
      }
    }

    app = new Ravel();
    // choose random port to support jest parallelization
    app.set('port', Math.floor(Math.random() * 10000) + 10000);
    app.set('log level', app.$log.NONE);
    app.set('keygrip keys', ['mysecret']);
    app.set('public directory', '/public');
    app.set('favicon path', '/favicon.ico');

    app.load(Users, UsersResource, TestRoutes, Another);
  });

  describe('#init()', () => {
    it('should initialize a koa server with appropriate middleware and parameters', async () => {
      let useSpy;
      const koaAppMock = class Moa extends require('koa') {
        constructor (...args) {
          super(...args);
          useSpy = jest.spyOn(this, 'use');
        }
      };
      jest.doMock('koa', () => koaAppMock);

      const session = async function (ctx, next) { await next(); };
      const sessionSpy = jest.fn(() => session);
      jest.doMock('koa-session', () => sessionSpy);

      const staticMiddleware = async function (ctx, next) { await next(); };
      const staticSpy = jest.fn(() => staticMiddleware);
      jest.doMock('koa-static', () => staticSpy);

      const favicon = async function (ctx, next) { await next(); };
      const faviconSpy = jest.fn(() => favicon);
      jest.doMock('koa-favicon', () => faviconSpy);

      const gzip = async function (ctx, next) { await next(); };
      const gzipSpy = jest.fn(() => gzip);
      jest.doMock('koa-compress', () => gzipSpy);

      await app.init();

      expect(sessionSpy).toHaveBeenCalled();
      expect(useSpy).toHaveBeenCalledWith(session);
      expect(gzipSpy).toHaveBeenCalled();
      expect(useSpy).toHaveBeenCalledWith(gzip);
      expect(staticSpy).toHaveBeenCalledWith(upath.toUnix(upath.posix.join(app.cwd, app.get('public directory'))), expect.any(Object));
      expect(useSpy).toHaveBeenCalledWith(staticMiddleware);
      expect(faviconSpy).toHaveBeenCalledWith(upath.toUnix(upath.posix.join(app.cwd, app.get('favicon path'))));
      expect(useSpy).toHaveBeenCalledWith(favicon);
      expect(app.initialized).toBeTruthy();
      expect(postinjectHandlerCalled).toBe(1);
      expect(anotherPostinjectHandlerCalled).toBe(1);
      expect(postinitHandlerCalled).toBe(1);
      expect(anotherPostinitHandlerCalled).toBe(1);
      expect(intervalCalled).toBe(0);
    });
  });

  describe('#listen()', () => {
    it('should throw Ravel.$err.NotAllowed if called before init()', async () => {
      await expect(app.listen()).rejects.toThrow(app.$err.NotAllowed);
    });

    it('should start the underlying HTTP server when called after init()', async () => {
      await app.init();
      expect(app.server).toBeInstanceOf(require('net').Server);
      expect(postinjectHandlerCalled).toBe(1);
      expect(anotherPostinitHandlerCalled).toBe(1);
      expect(anotherPostinjectHandlerCalled).toBe(1);
      expect(postinitHandlerCalled).toBe(1);
      expect(intervalCalled).toBe(0);
      app.server.listen = jest.fn(function (port, callback) {
        callback();
      });
      await app.listen();
      expect(app.server.listen).toHaveBeenCalledWith(app.get('port'), expect.any(Function));
      expect(prelistenHandlerCalled).toBe(1);
      expect(postlistenHandlerCalled).toBe(1);
      expect(app.listening).toBeTruthy();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(intervalCalled).toBeGreaterThanOrEqual(1);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      expect(intervalCalled).toBeGreaterThanOrEqual(2);
      await app.close();
    });

    it('should start the underlying HTTPS server when called after init()', async () => {
      app.set('https', true);
      await app.init();
      expect(app.server).toBeInstanceOf(require('tls').Server);
      app.server.listen = jest.fn(function (port, callback) {
        callback();
      });
      await app.listen();
      expect(app.server.listen).toHaveBeenCalledWith(app.get('port'), expect.any(Function));
      await app.close();
    });
  });

  describe('#start()', () => {
    it('should be a wrapper for Ravel.init() and Ravel.listen()', async () => {
      const initSpy = jest.spyOn(app, 'init');
      const listenSpy = jest.spyOn(app, 'listen');
      await app.start();
      expect(initSpy).toHaveBeenCalled();
      expect(listenSpy).toHaveBeenCalled();
      await app.close();
    });
  });

  describe('#close()', () => {
    it('should be a no-op if the underlying HTTP server isn\'t listening', async () => {
      await expect(app.close()).resolves;
    });

    it('should stop the underlying HTTP server if the server is listening', async () => {
      await app.init();
      await app.listen();
      await app.close();
      expect(postinjectHandlerCalled).toBe(1);
      expect(anotherPostinjectHandlerCalled).toBe(1);
      expect(postinitHandlerCalled).toBe(1);
      expect(anotherPostinitHandlerCalled).toBe(1);
      expect(prelistenHandlerCalled).toBe(1);
      expect(postlistenHandlerCalled).toBe(1);
      expect(endHandlerCalled).toBe(1);
      expect(koaconfigHandlerCalled).toBe(1);
      expect(typeof koaconfigAppReference).toBe('object');
    });
  });
});
