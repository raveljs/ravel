'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
var mockery = require('mockery');
var path = require('path');
var sinon = require('sinon');
chai.use(require('sinon-chai'));

var Ravel, fs, err, stub;

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
    err = null;
    mockery.registerMock('fs-readdir-recursive', function(basePath) {
      /*jshint unused:false*/
      return ['test1.js', 'test2.js', '.jshintrc'];
    });

    Ravel = new require('../../lib/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
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

      mockery.registerMock(path.join(Ravel.cwd, './modules/test1.js'), function(){});
      mockery.registerMock(path.join(Ravel.cwd, './modules/test2.js'), function(){});
      Ravel.modules('./modules');
      expect(Ravel._moduleFactories).to.have.property('test1');
      expect(Ravel._moduleFactories['test1']).to.be.a('function');
      expect(Ravel._moduleFactories).to.have.property('test2');
      expect(Ravel._moduleFactories['test2']).to.be.a('function');
      expect(Ravel._moduleFactories).to.not.have.property('.jshintrc');
      done();
    });

    it('should throw an ApplicationError.IllegalValue when supplied with a base path which is not a directory', function(done) {
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return false;}
        };
      });

      var spy = sinon.spy(Ravel.modules);
      expect(spy).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });
  });
});
