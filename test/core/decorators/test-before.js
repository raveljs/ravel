'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../../lib/util/application_error');

let before, utilSymbols;

describe('Ravel', function() {
  beforeEach(function(done) {
    before = require('../../../lib/ravel').Resource.before;
    utilSymbols = require('../../../lib/util/symbols');
    done();
  });

  afterEach(function(done) {
    before = undefined;
    utilSymbols = undefined;
    done();
  });

  describe('@before()', function() {
    it('should decorate a class with middleware that should precede every endpoint defined within', function(done) {
      @before('test1', 'test2')
      class Stub1 {
      }
      expect(Stub1.prototype[utilSymbols.beforeGlobalMiddleware]).to.be.an.array;
      expect(Stub1.prototype[utilSymbols.beforeGlobalMiddleware]).to.deep.equal(['test1', 'test2']);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @before', function(done) {
      const test = function() {
        @before([])
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotFound if @before is supplied without an argument', function(done) {
      const test = function() {
        @before()
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.NotFound);
      done();
    });

    it('should decorate a class with method-specific middleware if @before is applied to a method', function(done) {
      class Stub1 {
        @before('test1', 'test2')
        get() {

        }
      }
      expect(Stub1.prototype[utilSymbols.beforeMethodMiddleware].get).to.be.an.array;
      expect(Stub1.prototype[utilSymbols.beforeMethodMiddleware].get).to.deep.equal(['test1', 'test2']);
      done();
    });
  });
});
