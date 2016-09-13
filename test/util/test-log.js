'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');

let Ravel, intel, intelLogger, coreSymbols;

describe('Ravel.Log', function() {
  beforeEach((done) => {
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
      basicConfig: function() {},
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
    coreSymbols = require('../../lib/core/symbols');
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#setLevel()', function() {
    it('should allow clients to set the logging level', (done) => {
      const stub = sinon.stub(intel, 'setLevel');
      Ravel.log.setLevel(Ravel.log.TRACE);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.TRACE);
      done();
    });

    it('should throw ApplicationError.IllegalValue when an unknown log level is specified', (done) => {
      const stub = sinon.stub(intel, 'setLevel');
      try {
        Ravel.log.setLevel('UNKNOWN');
        done(new Error('#setLevel() should not accept unknown log levels.'));
      } catch (err) {
        expect(stub).to.have.not.been.called;
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });
  });

  describe('#trace()', function() {
    it('should allow logging at the trace level', (done) => {
      const stub = sinon.stub(intelLogger, 'trace');
      const message = 'a message';
      Ravel.log.trace(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#verbose()', function() {
    it('should allow logging at the verbose level', (done) => {
      const stub = sinon.stub(intelLogger, 'verbose');
      const message = 'a message';
      Ravel.log.verbose(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#debug()', function() {
    it('should allow logging at the debug level', (done) => {
      const stub = sinon.stub(intelLogger, 'debug');
      const message = 'a message';
      Ravel.log.debug(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#info()', function() {
    it('should allow logging at the info level', (done) => {
      const stub = sinon.stub(intelLogger, 'info');
      const message = 'a message';
      Ravel.log.info(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#warn()', function() {
    it('should allow logging at the warn level', (done) => {
      const stub = sinon.stub(intelLogger, 'warn');
      const message = 'a message';
      Ravel.log.warn(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#error()', function() {
    it('should allow logging at the error level', (done) => {
      const stub = sinon.stub(intelLogger, 'error');
      const message = 'a message';
      Ravel.log.error(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#critical()', function() {
    it('should allow logging at the critical level', (done) => {
      const stub = sinon.stub(intelLogger, 'critical');
      const message = 'a message';
      Ravel.log.critical(message);
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(message);
      done();
    });
  });

  describe('#getLogger()', function() {
    it('should return a named logger with identical logging methods to the root logger', (done) => {
      const logger = Ravel.log.getLogger('name');
      const message = 'a message';
      expect(logger).to.have.property('trace').that.is.a('function');
      let stub = sinon.stub(intelLogger, 'trace');
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
    it('should set the default log level on \'start\' if none was specified via Ravel.set(\'log level\')', (done) => {
      const stub = sinon.stub(intel, 'setLevel');
      Ravel.emit('pre init');
      Ravel.emit('pre load parameters');
      Ravel[coreSymbols.parametersLoaded] = true;
      Ravel.emit('post load parameters');
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.DEBUG);
      done();
    });

    it('should set the client selected log level on \'start\' if one was specified via Ravel.set(\'log level\')', (done) => {
      const stub = sinon.stub(intel, 'setLevel');
      Ravel.set('log level', Ravel.log.ERROR);
      Ravel.emit('pre init');
      Ravel.emit('pre load parameters');
      Ravel[coreSymbols.parametersLoaded] = true;
      Ravel.emit('post load parameters');
      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(intel.ERROR);
      done();
    });
  });
});
