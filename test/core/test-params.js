'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');

let Ravel, files, conf, coreSymbols;

describe('Ravel', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    files = [];
    conf = {};
    mockery.registerMock('rc', function(appName, target) {
      Object.assign(target, conf);
      target.configs = files;
      return target;
    });
    mockery.registerMock('redis', require('redis-mock'));
    Ravel = new (require('../../lib/ravel'))();
    coreSymbols = require('../../lib/core/symbols');
    Ravel.log.setLevel('NONE');
    done();
  });

  afterEach((done) => {
    Ravel = undefined;
    coreSymbols = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#set()', function() {
    it('should allow clients to set the value of a parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it ('should throw a Ravel.ApplicationError.IllegalValue error when a client attempts to set an unknown parameter', (done) => {
      try {
        Ravel.set('unknown param', 'test value');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.IllegalValue);
        done();
      }
    });
  });

  describe('#get()', function() {
    it('should allow clients to retrieve the value of a set optional parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should return undefined when clients attempt to retrieve the value of an unset optional parameter', (done) => {
      Ravel.registerParameter('test param', false);
      expect(Ravel.get('test param')).to.equal(undefined);
      done();
    });

    it('should allow clients to retrieve the value of a set required parameter', (done) => {
      Ravel.registerParameter('test param', true);
      Ravel.set('test param', 'test value');
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve an unregistered parameter', (done) => {
      try {
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve the value of an unset required parameter', (done) => {
      try {
        Ravel.registerParameter('test param', true);
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.NotFound);
        done();
      }
    });
  });

  describe('.config', function() {
    it('should return the full configuration of the given `ravel instance`', (done) => {
      const defaultConfig = Ravel.config;
      Ravel.registerParameter('test param', true);
      Ravel.registerParameter('test param 2', true);
      Ravel.set('test param', false);
      Ravel.set('test param 2', 10);

      const expected = {
        'test param': false,
        'test param 2': 10
      };
      Object.assign(expected, defaultConfig);

      expect(Ravel.config).to.deep.equal(expected);
      done();
    });
  });

  describe('#_loadParameters()', function() {
    it('should allow users to specify Ravel config parameters via a .ravelrc config file', (done) => {
      files = ['./ravelrc'];
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };

      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should not override parameters set programmatically via Ravel.set', (done) => {
      files = ['./ravelrc'];
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };

      Ravel.set('redis port', 6380);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(6380);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if an unregistered paramter is specified in the config file', (done) => {
      files = ['./ravelrc'];
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379,
      };
      conf[Math.random().toString()] = false;

      Ravel.set('redis port', 6380);
      expect(function() {
        Ravel[coreSymbols.loadParameters]();
      }).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should load defaults if no configuration files are present', (done) => {
      files = [];
      conf = undefined;

      const oldParams = {
        'redis host': '0.0.0.0',
        'redis port': 6379,
        'redis max retries': 10,
        'port':  8080,
        'app route': '/',
        'login route': '/login',
        'keygrip keys': ['123abc'],
        'log level': 'DEBUG',
        'configs': []
      };
      Ravel.set('keygrip keys', ['123abc']);
      Ravel.init();
      // now load params from non-existent ravelrc file
      expect(Ravel.config).to.deep.equal(oldParams);
      done();
    });
  });
});
