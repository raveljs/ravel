'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const ApplicationError = require('../../../lib/util/application_error');
const Metadata = require('../../../lib/util/meta');

let authconfig;

describe('Ravel', function() {
  beforeEach(function(done) {
    authconfig = require('../../../lib/ravel').Module.authconfig;
    done();
  });

  afterEach(function(done) {
    authconfig = undefined;
    done();
  });

  describe('@authconfig()', function() {
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
      expect(instance).to.have.a.property('getUserById').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUserByProfile').that.is.a.function;
      expect(instance).to.have.a.property('verifyCredentials').that.is.a.function;
      expect(instance.getUserById()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.getOrCreateUserByProfile()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verifyCredentials()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of getUser()', function(done) {
      @authconfig
      class Stub {
        getUserById() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('getUserById').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUserByProfile').that.is.a.function;
      expect(instance).to.have.a.property('verifyCredentials').that.is.a.function;
      expect(instance.getUserById()).to.eventually.deep.equal({});
      expect(instance.getOrCreateUserByProfile()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verifyCredentials()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of getOrCreateUserByProfile()', function(done) {
      @authconfig
      class Stub {
        getOrCreateUserByProfile() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('getUserById').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUserByProfile').that.is.a.function;
      expect(instance).to.have.a.property('verifyCredentials').that.is.a.function;
      expect(instance.getUserById()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.getOrCreateUserByProfile()).to.eventually.deep.equal({});
      expect(instance.verifyCredentials()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of verifyCredentials()', function(done) {
      @authconfig
      class Stub {
        verifyCredentials() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('getUserById').that.is.a.function;
      expect(instance).to.have.a.property('getOrCreateUserByProfile').that.is.a.function;
      expect(instance).to.have.a.property('verifyCredentials').that.is.a.function;
      expect(instance.getUserById()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.getOrCreateUserByProfile()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verifyCredentials()).to.eventually.deep.equal({});
      done();
    });
  });
});
