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
    mockery.registerMock('recursive-readdir', function(basePath, callback) {
      callback(err, ['resources/test1.js', 'resources/test2.js', 'resources/.jshintrc']);
    });

    Ravel = new require('../../lib-cov/ravel')();
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


  describe('#resources()', function() {
    it('should allow clients to recursively register resource files for instantiation in Ravel.start, ignoring non-js files', function(done) {
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return true;}
        };
      });

      mockery.registerMock(path.join(Ravel.cwd, './resources/test1.js'), function(){});
      mockery.registerMock(path.join(Ravel.cwd, './resources/test2.js'), function(){});
      Ravel.resources('./resources');
      expect(Ravel._resourceFactories).to.have.property('resources/test1.js');
      expect(Ravel._resourceFactories['resources/test1.js']).to.be.a('function');
      expect(Ravel._resourceFactories).to.have.property('resources/test2.js');
      expect(Ravel._resourceFactories['resources/test2.js']).to.be.a('function');
      expect(Ravel._resourceFactories).to.not.have.property('.jshintrc');
      done();
    });

    it('should throw an ApplicationError.IllegalValue when supplied with a base path which is not a directory', function(done) {
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return false;}
        };
      });

      var spy = sinon.spy(Ravel.resources);
      expect(spy).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw any error from recursive-readdir if one occurred', function(done) {
      err = new Error();
      stub = sinon.stub(fs, 'lstatSync', function() {
        return {
          isDirectory: function(){return true;}
        };
      });
      var spy = sinon.spy(Ravel.resources);
      expect(spy).to.throw(Error);
      err = null;
      done();
    });
  });
});
