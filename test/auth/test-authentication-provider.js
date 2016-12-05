'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
const expect = chai.expect
chai.use(require('chai-things'))
const mockery = require('mockery')

let Ravel, ravelApp, provider

describe('auth/authentication_provider', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })

    // mock ravelApp.kvstore, since we're not actually starting ravelApp.
    const redisMock = {
      createClient: () => {
        const redisClientStub = new (require('events').EventEmitter)() // eslint-disable-line no-extra-parens
        redisClientStub.auth = function () {}
        return redisClientStub
      }
    }
    mockery.registerMock('redis', redisMock)
    Ravel = require('../../lib/ravel')
    ravelApp = new Ravel()
    ravelApp.log.setLevel('NONE')
    class TestProvider extends Ravel.AuthenticationProvider {
      get name () {
        return 'test'
      }
    }
    provider = new TestProvider(ravelApp)
    done()
  })

  afterEach((done) => {
    ravelApp = undefined
    provider = undefined
    mockery.deregisterAll()
    mockery.disable()
    done()
  })

  describe('constructor', () => {
    it('should allow clients to implement an authentication provider which has a name and several methods', (done) => {
      class GoogleOAuth2 extends Ravel.AuthenticationProvider {
        get name () {
          return 'google-oauth2'
        }
      }
      provider = new GoogleOAuth2(ravelApp)
      ravelApp.emit('pre listen')
      expect(provider.name).to.equal('google-oauth2')
      expect(provider).to.have.property('init').that.is.a('function')
      expect(provider).to.have.property('handlesClient').that.is.a('function')
      expect(provider).to.have.property('credentialToProfile').that.is.a('function')
      expect(provider).to.have.property('log').that.is.an('object')
      expect(provider).to.have.property('ravelInstance').that.is.an('object')
      expect(provider).to.have.property('ApplicationError').that.is.an('object')
      done()
    })

    it('should require clients to supply a name for the provider', (done) => {
      expect(() => {
        new Ravel.AuthenticationProvider(ravelApp) // eslint-disable-line no-new
      }).to.throw(ravelApp.ApplicationError.NotImplemented)
      done()
    })
  })

  describe('#init()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', (done) => {
      try {
        provider.init()
        done(new Error('It should be impossible to call init() on the template authoriation provider.'))
      } catch (err) {
        expect(err).to.be.instanceof(ravelApp.ApplicationError.NotImplemented)
        done()
      }
    })
  })

  describe('#handlesClient()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', (done) => {
      try {
        provider.handlesClient()
        done(new Error('It should be impossible to call handlesClient() on the template authoriation provider.'))
      } catch (err) {
        expect(err).to.be.instanceof(ravelApp.ApplicationError.NotImplemented)
        done()
      }
    })
  })

  describe('#credentialToProfile()', () => {
    it('should throw ravelApp.ApplicationError.NotImplemented, since this is a template', (done) => {
      expect(provider.credentialToProfile()).to.eventually.be.rejectedWith(ravelApp.ApplicationError.NotImplemented)
      done()
    })
  })

  describe('ravelApp.authorizationProviders', () => {
    it('should return an empty Array if no AuthorizationProviders are registered', (done) => {
      ravelApp = new Ravel()
      ravelApp.log.setLevel('NONE')
      expect(ravelApp.authenticationProviders).to.be.a('function')
      expect(ravelApp.authenticationProviders()).to.be.an('array')
      expect(ravelApp.authenticationProviders().length).to.equal(0)
      done()
    })

    it('should return an Array of registered AuthorizationProviders', (done) => {
      class GoogleOAuth2 extends Ravel.AuthenticationProvider {
        get name () {
          return 'google-oauth2'
        }
      }
      provider = new GoogleOAuth2(ravelApp)
      expect(ravelApp.authenticationProviders).to.be.a('function')
      expect(ravelApp.authenticationProviders()).to.be.an('array')
      expect(ravelApp.authenticationProviders().length).to.equal(2)
      expect(ravelApp.authenticationProviders()[1]).to.equal(provider)
      done()
    })

    it('should require clients to supply a name for the provider', (done) => {
      expect(() => {
        new Ravel.AuthenticationProvider(ravelApp) // eslint-disable-line no-new
      }).to.throw(ravelApp.ApplicationError.NotImplemented)
      done()
    })
  })
})
