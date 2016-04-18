'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');

let Metadata;

describe('util/meta', function() {

  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    Metadata = require('../../lib/util/meta');
    done();
  });

  afterEach(function(done) {
    mockery.deregisterAll();mockery.disable();
    Metadata = undefined;
    done();
  });

  describe('#getMeta', function() {
    it('should support retrieving metadata from a class', function(done) {
      class Test {}
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {},
        method: {}
      });
      done();
    });

    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.getMeta(Test);
      }).to.throw;
      done();
    });
  });

  describe('#getClassMeta', function() {
    it('should support the retrieval of class-level metadata within a category', function(done) {
      class Test{}
      expect(Metadata.getClassMeta(Test.prototype, 'category')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.getClassMeta(Test, 'category');
      }).to.throw;
      done();
    });
  });

  describe('#getClassMetaValue', function() {
    it('should support the retrieval of a value from a category of class-level metadata', function(done) {
      class Test{}
      expect(Metadata.getClassMetaValue(Test.prototype, 'category', 'key')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.getClassMetaValue(Test, 'category', 'key');
      }).to.throw;
      done();
    });
  });

  describe('#getMethodMeta', function() {
    it('should support the retrieval of method-level metadata within a category', function(done) {
      class Test{}
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', 'category')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.getMethodMeta(Test, 'methodName', 'category');
      }).to.throw;
      done();
    });
  });

  describe('#getMethodMetaValue', function() {
    it('should support the retrieval of a value from a category of method-level metadata', function(done) {
      class Test{}
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', 'category', 'key')).to.be.undefined;
      done();
    });
    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.getMethodMetaValue(Test, 'methodName', 'category', 'key');
      }).to.throw;
      done();
    });
  });

  describe('#putClassMeta', function() {
    it('should support storing metdata at the class-level', function(done) {
      class Test{}
      Metadata.putClassMeta(Test.prototype, '@inject', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {
          '@inject': {
            'mykey':  'myvalue'
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

    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.putClassMeta(Test, '@inject', 'mykey', 'myvalue');
      }).to.throw;
      done();
    });
  });

  describe('#putMethodMeta', function() {
    it('should support storing metdata at the method-level', function(done) {
      class Test{}
      Metadata.putMethodMeta(Test.prototype, 'methodName', '@inject', 'mykey', 'myvalue');
      expect(Metadata.getMeta(Test.prototype)).to.deep.equal({
        class: {},
        method: {
          'methodName': {
            '@inject': {
              'mykey':  'myvalue'
            }
          }
        }
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@inject')).to.deep.equal({
        'mykey': 'myvalue'
      });
      expect(Metadata.getMethodMeta(Test.prototype, 'methodName', '@inject')).to.equal(
        Metadata.getMeta(Test.prototype).method.methodName['@inject']
      );
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@inject', 'mykey')).to.equal('myvalue');
      expect(Metadata.getMethodMetaValue(Test.prototype, 'methodName', '@inject', 'mykey')).to.equal(
        Metadata.getMeta(Test.prototype).method.methodName['@inject'].mykey
      );
      done();
    });

    it('should throw an exception if the target class isn\'t a prototype', function(done) {
      class Test {}
      expect(function() {
        return Metadata.putMethodMeta(Test, 'methodName', '@inject', 'mykey', 'myvalue');
      }).to.throw;
      done();
    });
  });
});
