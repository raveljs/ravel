'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const mockery = require('mockery');
const upath = require('upath');

let Ravel, conf, coreSymbols;

describe('Ravel', function() {
  beforeEach((done) => {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
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
      Ravel[coreSymbols.parametersLoaded] = true;
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
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should return undefined when clients attempt to retrieve the value of an unset optional parameter', (done) => {
      Ravel.registerParameter('test param', false);
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal(undefined);
      done();
    });

    it('should allow clients to retrieve the value of a set required parameter', (done) => {
      Ravel.registerParameter('test param', true);
      Ravel.set('test param', 'test value');
      Ravel[coreSymbols.parametersLoaded] = true;
      expect(Ravel.get('test param')).to.equal('test value');
      done();
    });

    it('should throw a Ravel.ApplicationError.General error when clients attempt to retrieve a parameter before loading', (done) => {
      try {
        Ravel[coreSymbols.parametersLoaded] = false;
        Ravel.get('test param');
        done(new Error('Should never reach this line.'));
      } catch (err) {
        expect(err).to.be.instanceof(Ravel.ApplicationError.General);
        done();
      }
    });

    it('should throw a Ravel.ApplicationError.NotFound error when clients attempt to retrieve an unregistered parameter', (done) => {
      try {
        Ravel[coreSymbols.parametersLoaded] = true;
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
        Ravel[coreSymbols.parametersLoaded] = true;
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
    it('should allow users to specify Ravel config parameters via a .ravelrc.json config file', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc.json'), conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      const parent = Ravel.cwd.split(upath.sep).slice(0,-1).join(upath.sep);
      mockery.registerMock(upath.join(parent, '.ravelrc.json'), conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should should support searching for .ravelrc.json files in any parent directory of app.cwd, including root', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      mockery.registerMock('/.ravelrc.json', conf);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(conf['redis port']);
      done();
    });

    it('should not override parameters set programmatically via Ravel.set', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379
      };
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc.json'), conf);

      Ravel.set('redis port', 6380);
      Ravel[coreSymbols.loadParameters]();
      expect(Ravel.get('koa view engine')).to.equal(conf['koa view engine']);
      expect(Ravel.get('redis port')).to.equal(6380);
      done();
    });

    it('should throw a Ravel.ApplicationError.IllegalValue if an unregistered paramter is specified in the config file', (done) => {
      conf = {
        'koa view engine': 'ejs',
        'redis port': 6379,
      };
      conf[Math.random().toString()] = false;
      mockery.registerMock(upath.join(Ravel.cwd, '.ravelrc.json'), conf);

      Ravel.set('redis port', 6380);
      expect(function() {
        Ravel[coreSymbols.loadParameters]();
      }).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should load defaults if no configuration files are present', (done) => {
      const oldParams = {
        'redis host': '0.0.0.0',
        'redis port': 6379,
        'redis max retries': 10,
        'port':  8080,
        'app route': '/',
        'login route': '/login',
        'keygrip keys': ['123abc'],
        'log level': 'DEBUG'
      };
      Ravel.set('keygrip keys', ['123abc']);
      Ravel.init();
      // now load params from non-existent ravelrc file
      expect(Ravel.config).to.deep.equal(oldParams);
      done();
    });
  });
});
