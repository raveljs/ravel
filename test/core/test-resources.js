'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

let Ravel, Resource, fs, err, stub;

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

    Ravel = new (require('../../lib/ravel'))();
    Resource = require('../../lib/ravel').Resource;
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

      mockery.registerMock(upath.join(Ravel.cwd, './resources/test1.js'), class extends Resource {});
      mockery.registerMock(upath.join(Ravel.cwd, './resources/test2.js'), class extends Resource {});
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

      const test = function() {
        Ravel.resources();
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });
  });
});
