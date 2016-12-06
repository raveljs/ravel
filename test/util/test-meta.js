'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../lib/util/application_error');

let Metadata;

describe('util/meta', () => {
  beforeEach((done) => {
    Metadata = require('../../lib/util/meta');
    done();
  });

  afterEach((done) => {
    Metadata = undefined;
    done();
  });

  describe('#getMeta', () => {
    it('should support retrieving metadata from a class', (done) => {
      class Test {}
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {},
        method: {}
      });
      done();
    });

    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      function test () {
        return Metadata.getMeta(Test);
      }
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });
  });

  describe('#getClassMeta', () => {
    it('should support the retrieval of class-level metadata within a category', (done) => {
      class Test {}
      expect(Metadata.getClassMeta(Test.prototype, 'category')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.getClassMeta(Test, 'category');
      }).to.throw;
      done();
    });
  });

  describe('#getClassMetaValue', () => {
    it('should support the retrieval of a value from a category of class-level metadata', (done) => {
      class Test {}
      expect(Metadata.getClassMetaValue(Test.prototype, 'category', 'key')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.getClassMetaValue(Test, 'category', 'key');
      }).to.throw;
      done();
    });
  });

  describe('#getMethodMeta', () => {
    it('should support the retrieval of method-level metadata within a category', (done) => {
      class Test {}
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', 'category')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.getMethodMeta(Test, 'methodName', 'category');
      }).to.throw;
      done();
    });
  });

  describe('#getMethodMetaValue', () => {
    it('should support the retrieval of a value from a category of method-level metadata', (done) => {
      class Test {}
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', 'category', 'key')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.getMethodMetaValue(Test, 'methodName', 'category', 'key');
      }).to.throw;
      done();
    });
  });

  describe('#putClassMeta', () => {
    it('should support storing metdata at the class-level', (done) => {
      class Test {}
      Metadata.putClassMeta(Test.prototype, '@inject', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {
          '@inject': {
            'mykey': 'myvalue'
          }
        },
        method: {}
      });
      expect(Metadata.getClassMeta(Test.prototype, '@inject')).to.deep.equal({
        'mykey': 'myvalue'
      });
      expect(Metadata.getClassMeta(Test.prototype, '@inject')).to.equal(
        Metadata.getMeta(Test.prototype).class['@inject']
      );
      expect(Metadata.getClassMetaValue(Test.prototype, '@inject', 'mykey')).to.equal('myvalue');
      expect(Metadata.getClassMetaValue(Test.prototype, '@inject', 'mykey')).to.equal(
        Metadata.getMeta(Test.prototype).class['@inject'].mykey
      );
      done();
    });

    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.putClassMeta(Test, '@inject', 'mykey', 'myvalue');
      }).to.throw;
      done();
    });
  });

  describe('#putMethodMeta', () => {
    it('should support storing metdata at the method-level', (done) => {
      class Test {}
      Metadata.putMethodMeta(Test.prototype, 'methodName', '@before', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {},
        method: {
          'methodName': {
            '@before': {
              'mykey': 'myvalue'
            }
          }
        }
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@before')).to.deep.equal({
        'mykey': 'myvalue'
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@before')).to.equal(
        Metadata.getMeta(Test.prototype).method.methodName['@before']
      );
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@before', 'mykey')).to.equal('myvalue');
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@before', 'mykey')).to.equal(
        Metadata.getMeta(Test.prototype).method.methodName['@before'].mykey
      );
      Metadata.putMethodMeta(Test.prototype, 'methodName', '@before', 'anotherkey', 'anothervalue');
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {},
        method: {
          'methodName': {
            '@before': {
              'mykey': 'myvalue',
              'anotherkey': 'anothervalue'
            }
          }
        }
      });
      done();
    });

    it('should throw an exception if the target class isn\'t a prototype', (done) => {
      class Test {}
      expect(() => {
        return Metadata.putMethodMeta(Test, 'methodName', '@inject', 'mykey', 'myvalue');
      }).to.throw;
      done();
    });
  });
});
