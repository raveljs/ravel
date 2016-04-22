'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const ApplicationError = require('../../lib/util/application_error');
const Metadata = require('../../lib/util/meta');

let authconfig;

describe('Ravel', function() {
  beforeEach(function(done) {
    authconfig = require('../../lib/ravel').Module.authconfig;
    done();
  });

  afterEach(function(done) {
    authconfig = undefined;
    done();
  });

  describe('@inject()', function() {
    it('should decorate a class with a hidden property indicating it is an authconfig module', function(done) {
      @authconfig
      class Stub {}
      const instance = new Stub();
      expect(Metadata.getClassMetaValue(Object.getPrototypeOf(instance),'@authconfig', 'enabled', false)).to.be.ok;
      done();
    });

    it('should add auth-related, stub prototype methods to a module if they are not already present', function(done) {
      @authconfig
      class Stub {}
      const instance = new Stub();
      expect(instance).to.have.a.property('getUser').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUser').that.is.a.function;
      expect(instance.getUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.getOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of getUser()', function(done) {
      @authconfig
      class Stub {
        getUser() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('getUser').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUser').that.is.a.function;
      expect(instance.getUser()).to.eventually.deep.equal({});
      expect(instance.getOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of getOrCreateUser()', function(done) {
      @authconfig
      class Stub {
        getOrCreateUser() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('getUser').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUser').that.is.a.function;
      expect(instance.getUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.getOrCreateUser()).to.eventually.deep.equal({});
      done();
    });
  });
});
