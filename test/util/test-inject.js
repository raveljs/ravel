'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../lib/util/application_error');

let inject;

describe('Ravel', function() {
  beforeEach(function(done) {
    inject = require('../../lib/ravel').inject;

    done();
  });

  afterEach(function(done) {
    inject = undefined;
    done();
  });

  describe('#inject()', function() {
    it('should decorate a class with a static inject array', function(done) {
      /*jshint ignore:start*/
      @inject('test1', 'test2')
      class Stub1 {
        constructor(test1, test2) {
        }
      }
      expect(Stub1.inject).to.be.an.array;
      expect(Stub1.inject).to.deep.equal(['test1', 'test2']);
      /*jshint ignore:end*/
      done();
    });

    it('should be able to be used more than once on the same class', function(done) {
      /*jshint ignore:start*/
      @inject('test1', 'test2')
      @inject('test3')
      class Stub1 {
        constructor(test1, test2, test3) {
        }
      }
      expect(Stub1.inject).to.be.an.array;
      expect(Stub1.inject).to.deep.equal(['test1', 'test2', 'test3']);
      /*jshint ignore:end*/
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @inject', function(done) {
      const test = function() {
        /*jshint ignore:start*/
        @inject([])
        class Stub {}
        /*jshint ignore:end*/
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if the target class already has a static inject property which is not an array', function(done) {
      const test = function() {
        /*jshint ignore:start*/
        @inject('test')
        class Stub {
          static get inject() {
            return 'hello';
          }
        }
        /*jshint ignore:end*/
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotFound if @inject is supplied without an argument', function(done) {
      const test = function() {
        /*jshint ignore:start*/
        @inject()
        class Stub {}
        /*jshint ignore:end*/
      };
      expect(test).to.throw(ApplicationError.NotFound);
      done();
    });
  });
});
