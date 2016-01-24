'use strict';

// var chai = require('chai');
// var expect = chai.expect;
// chai.use(require('chai-things'));
// var mockery = require('mockery');

var Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    //enable mockery
    // mockery.enable({
    //   useCleanCache: true,
    //   warnOnReplace: false,
    //   warnOnUnregistered: false
    // });
    Ravel = new (require('../lib/ravel'))();
    //Ravel.Log.setLevel('NONE');
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    // mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#constructor()', function() {
    it('should allow clients to create a new Ravel server', function(done) {
      console.dir(Ravel);
      done();
    });
  });
});
