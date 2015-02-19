'use strict';

var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
var sinon = require('sinon');
var mockery = require('mockery');
var httpMocks = require('node-mocks-http');

var Ravel, database, mysqlProvider, postgresProvider;

describe('db/database', function() {
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

    //load database module
    database = require('../../lib-cov/db/database')(Ravel);

    //mock a couple of providers for us to use
    mysqlProvider = new Ravel.DatabaseProvider('mysql');
    postgresProvider = new Ravel.DatabaseProvider('postgres');

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.disable();
    done();
  });

  describe('#middleware.enter()', function() {
    it('should populate req.transaction with an empty dictionary of database connection objects when no database providers are registered.', function(done) {
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var next = sinon.stub();
      database.middleware.enter()(req, httpMocks.createResponse(), next);
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({});
      done();
    });

    it('should populate req.transaction with a dictionary of open database connections when providers are registered', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var next = sinon.stub();
      var mysqlConnection = {}, postgresConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      database.middleware.enter()(req, httpMocks.createResponse(), next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      done();
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR if any of the registered database providers fails to provider a connection', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var mysqlConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(new Error(), null);
      });
      database.middleware.enter()(req, res, next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.not.have.been.called;
      expect(res).to.have.property('statusCode').that.equals(500);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('should end all open transactions (close/commit connections) when res.end() is called with a status of 200', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var mysqlConnection = {}, postgresConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      var postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      database.middleware.enter()(req, res, next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      res.sendStatus(200);
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('should end all open transactions (close/commit connections) when res.end() is called with a status of 201', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var mysqlConnection = {}, postgresConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      var postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      database.middleware.enter()(req, res, next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      res.sendStatus(201);
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('should end all open transactions (close/rollback connections) when res.end() is called with a status >= 300', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var res = httpMocks.createResponse();
      var endSpy = sinon.spy(res, 'end');
      var next = sinon.stub();
      var mysqlConnection = {}, postgresConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      var postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      database.middleware.enter()(req, res, next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      res.sendStatus(500);
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      expect(endSpy).to.have.been.called;
      done();
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when any open transactions fail to close/commit when res.end() is called', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib-cov/db/database')(Ravel);
      //mock stuff
      var req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      var res = httpMocks.createResponse();
      var next = sinon.stub();
      var mysqlConnection = {}, postgresConnection = {};
      var mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      var mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      var postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      var postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(new Error());
      });
      database.middleware.enter()(req, res, next);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      res.sendStatus(200);
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      expect(res).to.have.property('statusCode').that.equals(500);
      done();
    });
  });

  describe('#scoped.enter()', function() {

  });
});
