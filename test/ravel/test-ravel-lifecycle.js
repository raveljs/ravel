'use strict'

const chai = require('chai')
chai.use(require('sinon-chai'))
chai.use(require('chai-as-promised'))
const expect = chai.expect
const mockery = require('mockery')
const upath = require('upath')
const sinon = require('sinon')

let app
let postinitHandlerCalled = 0
let prelistenHandlerCalled = 0
let postlistenHandlerCalled = 0
let endHandlerCalled = 0
let koaconfigHandlerCalled = 0
let koaconfigAppReference

describe('Ravel lifeycle test', () => {
  beforeEach((done) => {
    process.removeAllListeners('unhandledRejection')
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })
    const redis = require('redis-mock')
    mockery.registerMock('redis', redis)
    // add in auth, since redis-mock doesn't have it
    const oldCreateClient = redis.createClient
    sinon.stub(redis, 'createClient', () => {
      const client = oldCreateClient.apply(redis, arguments)
      client.auth = () => {}
      return client
    })

    const Ravel = require('../../lib/ravel')
    const inject = Ravel.inject
    const postinit = Ravel.Module.postinit
    const prelisten = Ravel.Module.prelisten
    const postlisten = Ravel.Module.postlisten
    const preclose = Ravel.Module.preclose
    const koaconfig = Ravel.Module.koaconfig
    postinitHandlerCalled = 0
    prelistenHandlerCalled = 0
    postlistenHandlerCalled = 0
    koaconfigHandlerCalled = 0
    endHandlerCalled = 0

    const u = [{id: 1, name: 'Joe'}, {id: 2, name: 'Jane'}]

    // stub Module (business logic container)
    class Users extends Ravel.Module {
      getAllUsers () {
        return Promise.resolve(u)
      }

      getUser (userId) {
        if (userId < u.length) {
          return Promise.resolve(u[userId - 1])
        } else {
          return Promise.reject(new this.ApplicationError.NotFound('User id=' + userId + ' does not exist!'))
        }
      }

      @postinit
      doPostInit () {
        postinitHandlerCalled += 1
      }

      @prelisten
      doPreListen () {
        prelistenHandlerCalled += 1
      }

      @postlisten
      doPostListen () {
        postlistenHandlerCalled += 1
      }

      @preclose
      doEnd () {
        endHandlerCalled += 1
      }

      @koaconfig
      doKoaConfig (koaApp) {
        koaconfigHandlerCalled += 1
        koaconfigAppReference = koaApp
      }
    }

    // stub Resource (REST interface)
    const pre = Ravel.Resource.before // have to alias to @pre instead of proper @before, since the latter clashes with mocha
    @inject('users')
    class UsersResource extends Ravel.Resource {
      constructor (users) {
        super('/api/user')
        this.users = users
        this.someMiddleware = async function (ctx, next) { await next() }
      }

      @pre('someMiddleware')
      async getAll (ctx) {
        ctx.body = await this.users.getAllUsers()
      }

      async get (ctx) {
        ctx.body = await this.users.getUser(ctx.params.id)
      }
    }

    // stub Routes (miscellaneous routes, such as templated HTML content)
    const mapping = Ravel.Routes.mapping
    class TestRoutes extends Ravel.Routes {
      constructor () {
        super('/')
      }

      @mapping(Ravel.Routes.GET, '/app')
      async handler (ctx) {
        ctx.body = '<!DOCTYPE html><html></html>'
        ctx.status = 200
      }
    }

    app = new Ravel()
    app.set('log level', app.log.NONE)
    app.set('redis host', 'localhost')
    app.set('redis port', 5432)
    app.set('redis password', 'password')
    app.set('port', '9080')
    app.set('keygrip keys', ['mysecret'])
    app.set('koa favicon path', 'images/favicon.ico')

    mockery.registerMock(upath.join(app.cwd, 'users'), Users)
    app.module('users', 'users')
    mockery.registerMock(upath.join(app.cwd, 'usersResource'), UsersResource)
    app.resource('usersResource')
    mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes)
    app.routes('routes')
    done()
  })

  afterEach((done) => {
    app = undefined
    process.removeAllListeners('unhandledRejection')
    mockery.deregisterAll()
    mockery.disable()
    done()
  })

  describe('#init()', () => {
    it('should initialize an koa server with appropriate middleware and parameters', (done) => {
      app.set('koa public directory', 'public')
      app.set('koa view engine', 'ejs')
      app.set('koa view directory', 'views')

      let useSpy
      const koaAppMock = class Moa extends require('koa') {
        constructor (...args) {
          super(...args)
          useSpy = sinon.spy(this, 'use')
        }
      }
      mockery.registerMock('koa', koaAppMock)

      const session = async function (ctx, next) { await next() }
      const sessionSpy = sinon.stub().returns(session)
      mockery.registerMock('koa-generic-session', sessionSpy)

      const staticMiddleware = async function (ctx, next) { await next() }
      const staticSpy = sinon.stub().returns(staticMiddleware)
      mockery.registerMock('koa-static', staticSpy)

      const views = async function (ctx, next) { await next() }
      const viewSpy = sinon.stub().returns(views)
      mockery.registerMock('koa-views', viewSpy)

      const favicon = async function (ctx, next) { await next() }
      const faviconSpy = sinon.stub().returns(favicon)
      mockery.registerMock('koa-favicon', faviconSpy)

      const gzip = async function (ctx, next) { await next() }
      const gzipSpy = sinon.stub().returns(gzip)
      mockery.registerMock('koa-compress', gzipSpy)

      app.init()

      expect(sessionSpy).to.have.been.called
      expect(useSpy).to.have.been.calledWith(session)
      expect(gzipSpy).to.have.been.called
      expect(useSpy).to.have.been.calledWith(gzip)
      expect(staticSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa public directory')))
      expect(useSpy).to.have.been.calledWith(staticMiddleware)
      expect(viewSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa view directory')))
      expect(useSpy).to.have.been.calledWith(views)
      expect(faviconSpy).to.have.been.calledWith(upath.join(app.cwd, app.get('koa favicon path')))
      expect(useSpy).to.have.been.calledWith(favicon)
      expect(app.initialized).to.be.ok
      expect(postinitHandlerCalled).to.equal(1)
      done()
    })
  })

  describe('#listen()', () => {
    it('should throw Ravel.ApplicationError.NotAllowed if called before init()', () => {
      return expect(app.listen()).to.eventually.be.rejectedWith(app.ApplicationError.NotAllowed)
    })

    it('should start the underlying HTTP server when called after init()', (done) => {
      app.init()
      expect(postinitHandlerCalled).to.equal(1)
      const listenSpy = sinon.stub(app.server, 'listen', function (port, callback) {
        callback()
      })
      app.listen().then(() => {
        expect(listenSpy).to.have.been.calledWith(app.get('port'))
        expect(prelistenHandlerCalled).to.equal(1)
        expect(postlistenHandlerCalled).to.equal(1)
        expect(app.listening).to.be.ok
        done()
      })
    })
  })

  describe('#start()', () => {
    it('should be a wrapper for Ravel.init() and Ravel.listen()', (done) => {
      const initSpy = sinon.stub(app, 'init')
      const listenSpy = sinon.stub(app, 'listen')
      app.start()
      expect(initSpy).to.have.been.called
      expect(listenSpy).to.have.been.called
      done()
    })
  })

  describe('#close()', () => {
    it('should be a no-op if the underlying HTTP server isn\'t listening', (done) => {
      expect(app.close()).to.be.fulfilled
      done()
    })

    it('should stop the underlying HTTP server if the server is listening', (done) => {
      app.init()
      sinon.stub(app.server, 'close', function (callback) {
        callback()
      })
      app.listen()
      .then(() => {
        return app.close()
      })
      .then(() => {
        expect(postinitHandlerCalled).to.equal(1)
        expect(prelistenHandlerCalled).to.equal(1)
        expect(postlistenHandlerCalled).to.equal(1)
        expect(endHandlerCalled).to.equal(1)
        expect(koaconfigHandlerCalled).to.equal(1)
        expect(koaconfigAppReference).to.be.an('object')
        app.server.close.restore() // undo stub
        app.server.close(done) // actually close server so test suite exits cleanly
      }).catch((err) => {
        app.server.close.restore() // undo stub
        app.server.close() // actually close server so test suite exits cleanly
        done(err || new Error())
      })
    })
  })
})
