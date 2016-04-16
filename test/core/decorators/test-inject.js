'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');

let inject;

describe('Ravel', function() {
  beforeEach(function(done) {
    inject = require('../../../lib/ravel').inject;

    done();
  });

  afterEach(function(done) {
    inject = undefined;
    done();
  });

  describe('@inject()', function() {
    it('should decorate a class with inject metadata', function(done) {
      @inject('test1', 'test2')
      class Stub1 {
        constructor(test1, test2) { //eslint-disable-line no-unused-vars
        }
      }
      expect(Metadata.getClassMetaValue(Stub1, '@inject', 'dependencies')).to.be.an.array;
      expect(Metadata.getClassMetaValue(Stub1, '@inject', 'dependencies')).to.deep.equal(['test1', 'test2']);
      done();
    });

    it('should be able to be used more than once on the same class', function(done) {
      @inject('test1', 'test2')
      @inject('test3')
      class Stub1 {
        constructor(test1, test2, test3) { //eslint-disable-line no-unused-vars
        }
      }
      expect(Metadata.getClassMetaValue(Stub1, '@inject', 'dependencies')).to.be.an.array;
      expect(Metadata.getClassMetaValue(Stub1, '@inject', 'dependencies')).to.deep.equal(['test1', 'test2', 'test3']);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @inject', function(done) {
      const test = function() {
        @inject([])
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotFound if @inject is supplied without an argument', function(done) {
      const test = function() {
        @inject()
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.NotFound);
      done();
    });
  });
});
