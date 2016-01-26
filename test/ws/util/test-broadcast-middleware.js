'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
const sinon = require('sinon');
const mockery = require('mockery');
const httpMocks = require('node-mocks-http');

let Ravel, broadcastMiddleware, emitSpy;

describe('ws/util/broadcast_middleware', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new require('../../../lib/ravel')();
    Ravel.Log.setLevel(Ravel.Log.NONE);
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.
    Ravel.broadcast = {
      emit: function(){}
    };
    emitSpy = sinon.spy(Ravel.broadcast, 'emit');

    broadcastMiddleware = require('../../../lib/ws/util/broadcast_middleware')(Ravel);
    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('middleware', function() {
    it('should emit nothing and call next() when req.method is GET', function(done) {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity',
        headers: {}
      });
      const res = httpMocks.createResponse();
      const temp = res.end;
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.not.have.been.called;
      expect(res.end).to.equal(temp);
      done();
    });

    it('should emit nothing and call next() when req.method is POST and req.statusCode is not 200 or 201', function(done) {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/entity',
        headers: {}
      });
      const res = httpMocks.createResponse();
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(409);
      res.end();
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.not.have.been.called;
      done();
    });

    it('should emit nothing and call next() when req.method is PUT and req.statusCode is not 200 or 201', function(done) {
      const req = httpMocks.createRequest({
        method: 'PUT',
        url: '/entity/1',
        headers: {}
      });
      const res = httpMocks.createResponse();
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(404);
      res.end();
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.not.have.been.called;
      done();
    });

    it('should emit nothing and call next() when req.method is DELETE and req.statusCode is not 200 or 201', function(done) {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        url: '/entity/1',
        headers: {}
      });
      const res = httpMocks.createResponse();
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(500);
      res.end();
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.not.have.been.called;
      done();
    });

    it('should emit a create message to the appropriate websocket room when req.method is POST and res.status is 200 or 201', function(done) {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/entity',
        headers: {}
      });
      req.route = {
        path: '/entity/:id'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(201);
      const body = {};
      res.send(body);
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'create', '{}');
      done();
    });

    it('should emit a change message to the appropriate websocket room when req.method is PUT and res.status is 200', function(done) {
      const req = httpMocks.createRequest({
        method: 'PUT',
        url: '/entity/1',
        headers: {}
      });
      req.route = {
        path: '/entity/:id'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(200);
      const body = {};
      res.send(body);
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'change', '{}');
      done();
    });

    it('should emit a delete message to the appropriate websocket room when req.method is DELETE and res.status is 200', function(done) {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        url: '/entity/1',
        headers: {}
      });
      req.route = {
        path: '/entity/:id'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(200);
      const body = {};
      res.send(body);
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'delete', '{}');
      done();
    });

    it('should emit a change all message to the appropriate websocket room when req.method is PUT, res.status is 200, and the endpoint is missing its trailing parameter', function(done) {
      const req = httpMocks.createRequest({
        method: 'PUT',
        url: '/entity',
        headers: {}
      });
      req.route = {
        path: '/entity'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(200);
      const body = [];
      res.send(body);
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'change all', '[]');
      done();
    });

    it('should emit a delete all message to the appropriate websocket room when req.method is DELETE, res.status is 200, and the endpoint is missing its trailing paramete', function(done) {
      const req = httpMocks.createRequest({
        method: 'DELETE',
        url: '/entity',
        headers: {}
      });
      req.route = {
        path: '/entity'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(200);
      res.send();
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'delete all');
      done();
    });

    it('should strip JSON vulnerability protection, if present, from the body before emitting a message', function(done) {
      const req = httpMocks.createRequest({
        method: 'POST',
        url: '/entity',
        headers: {}
      });
      req.route = {
        path: '/entity/:id'
      };
      const res = httpMocks.createResponse();
      res.send = function(body) {
        res.body = body;
        res.end(body);
      };
      const next = sinon.stub();
      broadcastMiddleware(req, res, next);
      res.status(201);
      const body = {};
      res.send(')]}\',\n' + JSON.stringify(body));
      expect(next).to.have.been.calledWith();
      expect(emitSpy).to.have.been.calledWith('/entity', 'create', '{}');
      done();
    });

    //TODO strip json protection
  });

});
