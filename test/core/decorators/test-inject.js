'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');

let inject;

describe('Ravel', () => {
  beforeEach((done) => {
    inject = require('../../../lib/ravel').inject;
    done();
  });

  afterEach((done) => {
    inject = undefined;
    done();
  });

  describe('@inject()', () => {
    it('should decorate a class with inject metadata', (done) => {
      @inject('test1', 'test2')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).to.be.an('array');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).to.deep.equal(['test1', 'test2']);
      done();
    });

    it('should be able to be used more than once on the same class', (done) => {
      @inject('test1', 'test2')
      @inject('test3')
      class Stub1 {
      }
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).to.be.an('array');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@inject', 'dependencies')).to.deep.equal(['test1', 'test2', 'test3']);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @inject', (done) => {
      const test = () => {
        @inject([])
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotFound if @inject is supplied without an argument', (done) => {
      const test = () => {
        @inject()
        class Stub {} // eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.NotFound);
      done();
    });
  });
});
