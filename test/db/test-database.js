'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const httpMocks = require('node-mocks-http');

let Ravel, database, mysqlProvider, postgresProvider;

describe('db/database', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    //load database module
    database = require('../../lib/db/database')(Ravel);

    //mock a couple of providers for us to use
    mysqlProvider = new Ravel.DatabaseProvider('mysql');
    postgresProvider = new Ravel.DatabaseProvider('postgres');

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#middleware.enter()', function() {
    it('should populate req.transaction with an empty dictionary of database connection objects when no database providers are registered.', function(done) {
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const next = sinon.stub();
      database.middleware.enter()(req, httpMocks.createResponse(), next);
      expect(next).to.have.been.called;
      expect(req).to.have.a.property('transaction').that.deep.equals({});
      done();
    });

    it('should populate req.transaction with a dictionary of open database connections when providers are registered', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const next = sinon.stub();
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
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
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const res = httpMocks.createResponse();
      const endSpy = sinon.spy(res, 'end');
      const next = sinon.stub();
      const mysqlConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
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
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const res = httpMocks.createResponse();
      const endSpy = sinon.spy(res, 'end');
      const next = sinon.stub();
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
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
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const res = httpMocks.createResponse();
      const endSpy = sinon.spy(res, 'end');
      const next = sinon.stub();
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
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
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const res = httpMocks.createResponse();
      const endSpy = sinon.spy(res, 'end');
      const next = sinon.stub();
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
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
      database = require('../../lib/db/database')(Ravel);
      //mock stuff
      const req = httpMocks.createRequest({
        method: 'GET',
        url: '/entity'
      });
      const res = httpMocks.createResponse();
      const next = sinon.stub();
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
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
    it('should populate scoped callback with an empty dictionary of database connection objects when no database providers are registered', function(done) {
      const scopeForTransaction = sinon.stub();
      database.scoped.enter(scopeForTransaction);
      expect(scopeForTransaction).to.have.been.calledWithMatch({});
      done();
    });

    it('should populate scoped callback with a dictionary of open database connections when providers are registered', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const scopeForTransaction = sinon.stub();
      database.scoped.enter(scopeForTransaction);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(scopeForTransaction).to.have.been.calledWithMatch({
        mysql: mysqlConnection,
        postgres: postgresConnection
      });
      done();
    });

    it('should call actual callback with an error if any of the registered database providers fails to provider a connection', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      const mysqlConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const error = new Error();
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(error, null);
      });
      const scopeForTransaction = sinon.stub();
      const actualCallback = sinon.stub();
      database.scoped.enter(scopeForTransaction, actualCallback);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(actualCallback).to.have.been.calledWith(error);
      done();
    });

    it('should end all open transactions (close/commit connections) when exitTransaction is called with no errors', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const actualCallback = sinon.stub();
      database.scoped.enter(function(connections, exitTransaction) {
        expect(connections).to.deep.equal({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        exitTransaction(null, {});
      }, actualCallback);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      expect(actualCallback).to.have.been.calledWith(null);
      done();
    });

    it('should end all open transactions (close/rollback connections) when exitTransaction is called with an error', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const actualCallback = sinon.stub();
      const error = new Error();
      database.scoped.enter(function(connections, exitTransaction) {
        expect(connections).to.deep.equal({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        exitTransaction(error);
      }, actualCallback);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      expect(actualCallback).to.have.been.calledWith(error);
      done();
    });

    it('should actualCallback with a database-related error when any open transactions fail to close/commit after exitTransaction is called with no errors', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);
      const mysqlConnection = {}, postgresConnection = {};
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
        callback(null, mysqlConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(null);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
        callback(null, postgresConnection);
      });
      const error = new Error();
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
        callback(error);
      });
      const actualCallback = sinon.stub();
      database.scoped.enter(function(connections, exitTransaction) {
        expect(connections).to.deep.equal({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        exitTransaction(null, {});
      }, actualCallback);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
      expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      expect(actualCallback).to.have.been.calledWith(error);
      done();
    });
  });
});
