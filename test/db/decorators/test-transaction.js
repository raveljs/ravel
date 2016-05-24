'use strict';

const chai = require('chai');
const expect = chai.expect;
const ApplicationError = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');

let transaction;

describe('Ravel', function() {
  beforeEach(function(done) {
    transaction = require('../../../lib/ravel').Resource.transaction;
    done();
  });

  afterEach(function(done) {
    transaction = undefined;
    done();
  });

  describe('@before()', function() {

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @transaction', function(done) {
      const test = function() {
        @transaction([])
        class Stub {} //eslint-disable-line no-unused-vars
      };
      expect(test).to.throw(ApplicationError.IllegalValue);
      done();
    });

    it('should indicate that all connections should be opened when used without an argument', function(done) {
      class Stub1 {
        @transaction()
        get() {

        }
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal([]);
      done();
    });

    it('should indicate which connections should be opened when used with arguments', function(done) {
      class Stub1 {
        @transaction('mysql', 'redis')
        get() {

        }
      }
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.be.an.array;
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'get', '@transaction', 'providers')).to.deep.equal(['mysql', 'redis']);
      done();
    });
  });
});
