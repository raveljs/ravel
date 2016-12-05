'use strict'

const chai = require('chai')
const expect = chai.expect
chai.use(require('chai-things'))
const mockery = require('mockery')
const upath = require('upath')
const sinon = require('sinon')
chai.use(require('sinon-chai'))

let Ravel, Module, fs, stub, coreSymbols

describe('Ravel', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    })

    fs = require('fs')
    mockery.registerMock('fs', fs)
    mockery.registerMock('fs-readdir-recursive', function (basePath) {  // eslint-disable-line no-unused-vars
      return ['test1.js', 'test2.js', '.eslintrc', 'package/test3.js']
    })
    Ravel = new (require('../../lib/ravel'))()
    coreSymbols = require('../../lib/core/symbols')
    Module = require('../../lib/ravel').Module
    Ravel.log.setLevel(Ravel.log.NONE)
    Ravel.kvstore = {} // mock Ravel.kvstore, since we're not actually starting Ravel.
    done()
  })

  afterEach((done) => {
    Ravel = undefined
    Module = undefined
    coreSymbols = undefined
    mockery.deregisterAll()
    mockery.disable()
    if (stub) {
      stub.restore()
    }
    done()
  })

  describe('#modules()', () => {
    it('should allow clients to recursively register module files for instantiation in Ravel.start, ignoring non-js files', (done) => {
      stub = sinon.stub(fs, 'lstatSync', function () {
        return {
          isDirectory: function () { return true }
        }
      })

      mockery.registerMock(upath.join(Ravel.cwd, './modules/test1.js'), class extends Module {})
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2.js'), class extends Module {})
      mockery.registerMock(upath.join(Ravel.cwd, './modules/package/test3.js'), class extends Module {})
      Ravel.modules('./modules')
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test1')
      expect(Ravel[coreSymbols.moduleFactories].test1).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test2')
      expect(Ravel[coreSymbols.moduleFactories].test2).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('package.test3')
      expect(Ravel[coreSymbols.moduleFactories].test2).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.not.have.property('.eslintrc')
      done()
    })

    it('should throw an ApplicationError.IllegalValue when supplied with a base path which is not a directory', (done) => {
      stub = sinon.stub(fs, 'lstatSync', function () {
        return {
          isDirectory: function () { return false }
        }
      })
      const test = () => {
        Ravel.modules('./blah/blah')
      }
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue)
      done()
    })

    it('should support absolute base paths', (done) => {
      stub = sinon.stub(fs, 'lstatSync', function () {
        return {
          isDirectory: function () { return true }
        }
      })

      mockery.registerMock(upath.join(Ravel.cwd, './modules/test1.js'), class extends Module {})
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2.js'), class extends Module {})
      mockery.registerMock(upath.join(Ravel.cwd, './modules/package/test3.js'), class extends Module {})
      Ravel.modules(upath.join(Ravel.cwd, './modules'))
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test1')
      expect(Ravel[coreSymbols.moduleFactories].test1).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('test2')
      expect(Ravel[coreSymbols.moduleFactories].test2).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.have.property('package.test3')
      expect(Ravel[coreSymbols.moduleFactories].test2).to.be.a('function')
      expect(Ravel[coreSymbols.moduleFactories]).to.not.have.property('.eslintrc')
      done()
    })
  })
})
