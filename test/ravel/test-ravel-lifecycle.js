'use strict';

const chai = require('chai');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');

let app;
let postinitHandlerCalled = 0;
let prelistenHandlerCalled = 0;
let postlistenHandlerCalled = 0;
let endHandlerCalled = 0;

describe('Ravel lifeycle test', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    const redis = require('redis-mock');
    mockery.registerMock('redis', redis);
    //add in auth, since redis-mock doesn't have it
    const oldCreateClient = redis.createClient;
    sinon.stub(redis, 'createClient', function() {
      const client = oldCreateClient.apply(redis, arguments);
      client.auth = function() {};
      return client;
    });

    const Ravel = require('../../lib/ravel');
    const inject = Ravel.inject;
    const postinit = Ravel.Module.postinit;
    const prelisten = Ravel.Module.prelisten;
    const postlisten = Ravel.Module.postlisten;
    const preclose = Ravel.Module.preclose;
    postinitHandlerCalled = 0;
    prelistenHandlerCalled = 0;
    postlistenHandlerCalled = 0;
    endHandlerCalled = 0;

    const u = [{id:1, name:'Joe'}, {id:2, name:'Jane'}];

    //stub Module (business logic container)
    @inject('$E')
    class Users extends Ravel.Module {
      constructor($E) {
        super();
        this.$E = $E;
      }

      getAllUsers() {
        return Promise.resolve(u);
      }

      getUser(userId) {
        if (userId < u.length) {
          return Promise.resolve(u[userId-1]);
        } else {
          return Promise.reject(new this.$E.NotFound('User id=' + userId + ' does not exist!'));
        }
      }

      @postinit
      doPostInit() {
        postinitHandlerCalled += 1;
      }

      @prelisten
      doPreListen() {
        prelistenHandlerCalled += 1;
      }

      @postlisten
      doPostListen() {
        postlistenHandlerCalled += 1;
      }

      @preclose
      doEnd() {
        endHandlerCalled += 1;
      }
    }

    //stub Resource (REST interface)
    const pre = Ravel.Resource.before;  //have to alias to @pre instead of proper @before, since the latter clashes with mocha
    @inject('users', '$E')
    class UsersResource extends Ravel.Resource {
      constructor(users, $E) {
        super('/api/user');
        this.users = users;
        this.$E = $E;
      }

      @pre('respond')
      getAll(ctx) {
        return this.users.getAllUsers()
        .then((list) => {
          ctx.body = list;
        });
      }

      @pre('respond')
      get(ctx) {
        // return promise and don't catch possible error so that Ravel can catch it
        return this.users.getUser(ctx.params.id)
        .then((result) => {
          ctx.body = result;
        });
      }
    }

    //stub Routes (miscellaneous routes, such as templated HTML content)
    const mapping = Ravel.Routes.mapping;
    class TestRoutes extends Ravel.Routes {
      constructor() {
        super('/');
      }

      @mapping(Ravel.Routes.GET, '/app')
      handler(ctx) {
        ctx.body = '<!DOCTYPE html><html></html>';
        ctx.status = 200;
      }
    }

    app = new Ravel();
    app.set('log level', app.Log.NONE);
    app.set('redis host', 'localhost');
    app.set('redis port', 5432);
    app.set('redis password', 'password');
    app.set('port', '9080');
    app.set('keygrip keys', ['mysecret']);
    app.set('koa favicon path', 'images/favicon.ico');

    mockery.registerMock(upath.join(app.cwd, 'users'), Users);
    app.module('users', 'users');
    mockery.registerMock(upath.join(app.cwd, 'usersResource'), UsersResource);
    app.resource('usersResource');
    mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
    app.routes('routes');
    done();
  });

  afterEach(function(done) {
    app = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#init()', function() {
    it('should initialize an koa server with appropriate middleware and parameters', function(done) {
      app.set('koa public directory', 'public');
      app.set('koa view engine', 'ejs');
      app.set('koa view directory', 'views');

      const koaAppMock = require('koa')();
      const useSpy = sinon.spy(koaAppMock, 'use');
      mockery.registerMock('koa', function() { return koaAppMock; });

      const session = function*(next) { yield next; };
      const sessionSpy = sinon.stub().returns(session);
      mockery.registerMock('koa-generic-session', sessionSpy);

      const staticMiddleware = function*(next) { yield next; };
      const staticSpy = sinon.stub().returns(staticMiddleware);
      mockery.registerMock('koa-static', staticSpy);

      const views = function*(next) { yield next; };
      const viewSpy = sinon.stub().returns(views);
      mockery.registerMock('koa-views', viewSpy);

      const favicon = function*(next) { yield next; };
      const faviconSpy = sinon.stub().returns(favicon);
      mockery.registerMock('koa-favicon', faviconSpy);

      const gzip = function*(next) { yield next; };
      const gzipSpy = sinon.stub().returns(gzip);
      mockery.registerMock('koa-compressor', gzipSpy);

      app.init();

      expect(sessionSpy).to.have.been.called;
      expect(useSpy).to.have.been.calledWith(session);
      expect(gzipSpy).to.have.been.called;
      expect(useSpy).to.have.been.calledWith(gzip);
      expect(staticSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa public directory')));
      expect(useSpy).to.have.been.calledWith(staticMiddleware);
      expect(viewSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa view directory')));
      expect(useSpy).to.have.been.calledWith(views);
      expect(faviconSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa favicon path')));
      expect(useSpy).to.have.been.calledWith(favicon);
      expect(app.initialized).to.be.ok;
      expect(postinitHandlerCalled).to.equal(1);
      done();
    });
  });

  describe('#listen()', function() {
    it('should throw Ravel.ApplicationError.NotAllowed if called before init()', function() {
      return expect(app.listen()).to.eventually.be.rejectedWith(app.ApplicationError.NotAllowed);
    });

    it('should start the underlying HTTP server when called after init()', function(done) {
      app.init();
      expect(postinitHandlerCalled).to.equal(1);
      const listenSpy = sinon.stub(app.server, 'listen', function(port, callback) {
        callback();
      });
      app.listen().then(function() {
        expect(listenSpy).to.have.been.calledWith(app.get('port'));
        expect(prelistenHandlerCalled).to.equal(1);
        expect(postlistenHandlerCalled).to.equal(1);
        expect(app.listening).to.be.ok;
        done();
      });
    });
  });

  describe('#start()', function() {
    it('should be a wrapper for Ravel.init() and Ravel.listen()', function(done) {
      const initSpy = sinon.stub(app, 'init');
      const listenSpy = sinon.stub(app, 'listen');
      app.start();
      expect(initSpy).to.have.been.called;
      expect(listenSpy).to.have.been.called;
      done();
    });
  });

  describe('#close()', function() {
    it('should be a no-op if the underlying HTTP server isn\'t listening', function(done) {
      expect(app.close()).to.be.fulfilled;
      done();
    });

    it('should stop the underlying HTTP server if the server is listening', function(done) {
      app.init();
      sinon.stub(app.server, 'close', function(callback) {
        callback();
      });
      app.listen()
      .then(function() {
        return app.close();
      })
      .then(() =>  {
        expect(postinitHandlerCalled).to.equal(1);
        expect(prelistenHandlerCalled).to.equal(1);
        expect(postlistenHandlerCalled).to.equal(1);
        expect(endHandlerCalled).to.equal(1);
        app.server.close.restore(); // undo stub
        app.server.close(done); // actually close server so test suite exits cleanly
      }).catch(() =>  {
        app.server.close.restore(); // undo stub
        app.server.close(); // actually close server so test suite exits cleanly
        done(new Error());
      });
    });
  });
});
