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
      expect(instance).to.have.a.property('serializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeOrCreateUser').that.is.a.function;
      expect(instance).to.have.a.property('verify').that.is.a.function;
      expect(instance.serializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verify()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of serializeUser()', function(done) {
      @authconfig
      class Stub {
        serializeUser(user) {
          return Promise.resolve(user.id);
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('serializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeOrCreateUser').that.is.a.function;
      expect(instance).to.have.a.property('verify').that.is.a.function;
      expect(instance.serializeUser({id:12})).to.eventually.equal(12);
      expect(instance.deserializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verify()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of deserializeUser()', function(done) {
      @authconfig
      class Stub {
        deserializeUser() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('serializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeOrCreateUser').that.is.a.function;
      expect(instance).to.have.a.property('verify').that.is.a.function;
      expect(instance.serializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).to.eventually.deep.equal({});
      expect(instance.deserializeOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verify()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of deserializeOrCreateUser()', function(done) {
      @authconfig
      class Stub {
        deserializeOrCreateUser() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('serializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeOrCreateUser').that.is.a.function;
      expect(instance).to.have.a.property('verify').that.is.a.function;
      expect(instance.serializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).to.eventually.deep.equal({});
      expect(instance.verify()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      done();
    });

    it('should retain an existing implementation of verify()', function(done) {
      @authconfig
      class Stub {
        verify() {
          return Promise.resolve({});
        }
      }
      const instance = new Stub();
      expect(instance).to.have.a.property('serializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeUser').that.is.a.function;
      expect(instance).to.have.a.property('deserializeOrCreateUser').that.is.a.function;
      expect(instance).to.have.a.property('verify').that.is.a.function;
      expect(instance.serializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.deserializeOrCreateUser()).to.eventually.be.rejectedWith(ApplicationError.NotImplemented);
      expect(instance.verify()).to.eventually.deep.equal({});
      done();
    });
  });
});
