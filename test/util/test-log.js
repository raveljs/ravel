'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');

var Ravel, intel, intelLogger;

describe('Ravel.Log', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    //we have to completely mock intel because its
    //methods are read-only, so sinon can't touch them :(
    intelLogger = {
      trace: function() {},
      verbose: function() {},
      debug: function() {},
      info: function() {},
      warn: function() {},
      error: function() {},
      critical: function() {}
    };
    intel = {
      TRACE: 'TRACE',
      VERBOSE: 'VERBOSE',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      CRITICAL: 'CRITICAL',
      NONE: 'NONE',
      ALL: 'ALL',
      getLogger: function() {
        return intelLogger;
      },
      setLevel: function() {

      },
      trace: function() {},
      verbose: function() {},
      debug: function() {},
      info: function() {},
      warn: function() {},
      error: function() {},
      critical: function() {}
    };
    mockery.registerMock('intel', intel);
    Ravel = new (require('../../lib/ravel'))();
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#setLevel()', function() {
    it('should allow clients to set the logging level', function(done) {
      var stub = sinon.stub(intel, 'setLevel');
      Ravel.Log.setLevel(Ravel.Log.TRACE);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.TRACE);
      done();
    });

    it('should throw ApplicationError.IllegalValue when an unknown log level is specified', function(done) {
      var stub = sinon.stub(intel, 'setLevel');
      try {
        Ravel.Log.setLevel('UNKNOWN');
        done(new Error('#setLevel() should not accept unknown log levels.'));
      } catch (err) {
        expect(stub).to.have.not.been.called;
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });
  });

  describe('#trace()', function() {
    it('should allow logging at the trace level', function(done) {
      var stub = sinon.stub(intelLogger, 'trace');
      var message = 'a message';
      Ravel.Log.trace(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#verbose()', function() {
    it('should allow logging at the verbose level', function(done) {
      var stub = sinon.stub(intelLogger, 'verbose');
      var message = 'a message';
      Ravel.Log.verbose(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#debug()', function() {
    it('should allow logging at the debug level', function(done) {
      var stub = sinon.stub(intelLogger, 'debug');
      var message = 'a message';
      Ravel.Log.debug(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#info()', function() {
    it('should allow logging at the info level', function(done) {
      var stub = sinon.stub(intelLogger, 'info');
      var message = 'a message';
      Ravel.Log.info(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#warn()', function() {
    it('should allow logging at the warn level', function(done) {
      var stub = sinon.stub(intelLogger, 'warn');
      var message = 'a message';
      Ravel.Log.warn(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#error()', function() {
    it('should allow logging at the error level', function(done) {
      var stub = sinon.stub(intelLogger, 'error');
      var message = 'a message';
      Ravel.Log.error(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#critical()', function() {
    it('should allow logging at the critical level', function(done) {
      var stub = sinon.stub(intelLogger, 'critical');
      var message = 'a message';
      Ravel.Log.critical(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#getLogger()', function() {
    it('should return a named logger with identical logging methods to the root logger', function(done) {
      var logger = Ravel.Log.getLogger('name');
      var message = 'a message';
      expect(logger).to.have.property('trace').that.is.a('function');
      var stub = sinon.stub(intelLogger, 'trace');
      logger.trace(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('verbose').that.is.a('function');
      stub = sinon.stub(intelLogger, 'verbose');
      logger.verbose(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('debug').that.is.a('function');
      stub = sinon.stub(intelLogger, 'debug');
      logger.debug(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('info').that.is.a('function');
      stub = sinon.stub(intelLogger, 'info');
      logger.info(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('warn').that.is.a('function');
      stub = sinon.stub(intelLogger, 'warn');
      logger.warn(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('error').that.is.a('function');
      stub = sinon.stub(intelLogger, 'error');
      logger.error(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      expect(logger).to.have.property('critical').that.is.a('function');
      stub = sinon.stub(intelLogger, 'critical');
      logger.critical(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('on(\'start\')', function() {
    it('should set the default log level on \'start\' if none was specified via Ravel.set(\'log level\')', function(done) {
      var stub = sinon.stub(intel, 'setLevel');
      Ravel.emit('pre init');
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.DEBUG);
      done();
    });

    it('should set the client selected log level on \'start\' if one was specified via Ravel.set(\'log level\')', function(done) {
      var stub = sinon.stub(intel, 'setLevel');
      Ravel.set('log level', Ravel.Log.ERROR);
      Ravel.emit('pre init');
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.ERROR);
      done();
    });
  });
});
