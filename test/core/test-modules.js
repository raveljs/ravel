'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

let Ravel, Module, fs, stub;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    fs = require('fs');
    mockery.registerMock('fs', fs);
    mockery.registerMock('fs-readdir-recursive', function(basePath) {  //eslint-disable-line no-unused-vars
      return ['test1.js', 'test2.js', '.eslintrc'];
    });
    Ravel = new (require('../../lib/ravel'))();
    Module = require('../../lib/ravel').Module;
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    Module = undefined;
    mockery.deregisterAll();
    mockery.disable();
    if (stub) {
      stub.restore();
    }
    done();
  });


  describe('#modules()', function() {
    it('should allow clients to recursively register module files for instantiation in Ravel.start, ignoring non-js files', function(done) {
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return true;}
        };
      });

      mockery.registerMock(upath.join(Ravel.cwd, './modules/test1.js'), class extends Module {});
      mockery.registerMock(upath.join(Ravel.cwd, './modules/test2.js'), class extends Module {});
      Ravel.modules('./modules');
      expect(Ravel._moduleFactories).to.have.property('test1');
      expect(Ravel._moduleFactories.test1).to.be.a('function');
      expect(Ravel._moduleFactories).to.have.property('test2');
      expect(Ravel._moduleFactories.test2).to.be.a('function');
      expect(Ravel._moduleFactories).to.not.have.property('.eslintrc');
      done();
    });

    it('should throw an ApplicationError.IllegalValue when supplied with a base path which is not a directory', function(done) {
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return false;}
        };
      });
      const test = function() {
        Ravel.modules();
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });
  });
});
