'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');
var httpMocks = require('node-mocks-http');
var httpCodes = require('../../lib-cov/util/http_codes');

var Ravel, rest;

describe('util/rest', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new require('../../lib-cov/ravel')();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    rest = require('../../lib-cov/util/rest')(Ravel);
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    rest = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#respond()', function() {
    it('should produce a response with HTTP 204 NO CONTENT if no json payload is supplied', function (done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(null, null);
      expect(res).to.have.property('statusCode').that.equals(204);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should produce a response with HTTP 200 OK containing a string body if a json payload is supplied', function (done) {
      var result = {};
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'send');
      rest.respond({}, res)(null, result);
      expect(res).to.have.property('statusCode').that.equals(200);
      expect(res._getData()).to.equal(')]}\',\n' + JSON.stringify(result));
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should produce a response with HTTP 200 OK containing a json body if a json payload is supplied and \'disable json vulnerability protection\' is true', function(done) {
      Ravel.set('disable json vulnerability protection', true);
      var result = {};
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'send');
      rest.respond({}, res)(null, result);
      expect(res).to.have.property('statusCode').that.equals(200);
      expect(res._getData()).to.equal(result);
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should produce a response with HTTP 201 CREATED and an appropriate location header if a json body containing a property \'id\' is supplied along with an okCode of CREATED', function(done) {
      var req = httpMocks.createRequest({
        method: 'POST',
        url: '/entity',
        headers: {
          origin: 'http://localhost:8080/'
        }
      });
      var result = {
        id:1
      };
      var res = httpMocks.createResponse();
      res.location = function() {
        expect(arguments.length).to.equal(1);
        expect(arguments[0]).to.equal('http://localhost:8080/entity/1');
      };
      var spy = sinon.spy(res, 'send');
      rest.respond(req, res)(null, result);
      expect(res).to.have.property('statusCode').that.equals(201);
      expect(res._getData()).to.equal(')]}\',\n' + JSON.stringify(result));
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should produce a response with HTTP 206 PARTIAL CONTENT if it is supplied as an okCode along with options.start, options.end and options.count', function(done) {
      var result = [];
      //test proper options
      var res = httpMocks.createResponse();
      var sendSpy = sinon.spy(res, 'send');
      var headerSpy = sinon.spy(res, 'setHeader');
      var options = {
        start: 0,
        end: 5,
        count: 10
      };
      rest.respond({}, res, httpCodes.PARTIAL_CONTENT, options)(null, result);
      expect(res).to.have.property('statusCode').that.equals(206);
      expect(res._getData()).to.equal(')]}\',\n' + JSON.stringify(result));
      expect(sendSpy).to.have.been.calledOnce;
      expect(headerSpy).to.have.been.calledWith('Content-Range', 'items '+options.start+'-'+options.end+'/'+options.count);

      //test missing options
      res = httpMocks.createResponse();
      sendSpy = sinon.spy(res, 'send');
      headerSpy = sinon.spy(res, 'setHeader');
      rest.respond({}, res, httpCodes.PARTIAL_CONTENT, {
        start: 0
      })(null, result);
      expect(res).to.have.property('statusCode').that.equals(206);
      expect(res._getData()).to.equal(')]}\',\n' + JSON.stringify(result));
      expect(sendSpy).to.have.been.calledOnce;
      expect(headerSpy).to.not.have.been.called;
      done();
    });

    it('should respond with HTTP 404 NOT FOUND when ApplicationError.NotFound is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.NotFound(), null);
      expect(res).to.have.property('statusCode').that.equals(404);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 403 Forbidden when ApplicationError.Access is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.Access(), null);
      expect(res).to.have.property('statusCode').that.equals(403);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 405 METHOD NOT ALLOWED when ApplicationError.NotAllowed is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.NotAllowed(), null);
      expect(res).to.have.property('statusCode').that.equals(405);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 501 NOT IMPLEMENTED when ApplicationError.NotImplemented is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.NotImplemented(), null);
      expect(res).to.have.property('statusCode').that.equals(501);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 409 CONFLICT when ApplicationError.DuplicateEntry is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.DuplicateEntry(), null);
      expect(res).to.have.property('statusCode').that.equals(409);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 416 REQUESTED_RANGE_NOT_SATISFIABLE when ApplicationError.RangeOutOfBounds is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.RangeOutOfBounds(), null);
      expect(res).to.have.property('statusCode').that.equals(416);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 404 NOT FOUND when ApplicationError.IllegalValue is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Ravel.ApplicationError.IllegalValue(), null);
      expect(res).to.have.property('statusCode').that.equals(400);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when an unknown Error type is passed as err', function(done) {
      var res = httpMocks.createResponse();
      var spy = sinon.spy(res, 'end');
      rest.respond({}, res)(new Error(), null);
      expect(res).to.have.property('statusCode').that.equals(500);
      expect(res._getData()).to.equal('');
      expect(spy).to.have.been.calledOnce;
      done();
    });
  });
});
