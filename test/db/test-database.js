'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const koa = require('koa');
const request = require('supertest');

let Ravel, DatabaseProvider, app, database, mysqlProvider, postgresProvider; //eslint-disable-line

describe('db/database', function() {
  beforeEach(function(done) {
    //enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    app = koa();
    Ravel = new (require('../../lib/ravel'))();
    DatabaseProvider = require('../../lib/ravel').DatabaseProvider;
    Ravel.Log.setLevel('NONE');
    Ravel.kvstore = {}; //mock Ravel.kvstore, since we're not actually starting Ravel.

    //load database module
    database = require('../../lib/db/database')(Ravel);

    //mock a couple of providers for us to use
    mysqlProvider = new DatabaseProvider('mysql');
    postgresProvider = new DatabaseProvider('postgres');

    done();
  });

  afterEach(function(done) {
    app = undefined;
    Ravel = undefined;
    DatabaseProvider = undefined;
    mysqlProvider = undefined;
    postgresProvider = undefined;
    mockery.deregisterAll();mockery.disable();
    done();
  });

  describe('#middleware', function() {
    it('should populate context.transaction with an empty dictionary of database connection objects when no database providers are registered.', function(done) {
      app.use(database.middleware);
      app.use(function*(){
        expect(this).to.have.a.property('transaction').that.deep.equals({});
      });

      request(app.callback())
      .get('/')
      .end(done);
    });

    it('should populate req.transaction with a dictionary of open database connections when providers are registered', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);

      //mock stuff
      const mysqlConnection = Object.create(null), postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function() {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function() {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function() {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function() {
        return Promise.resolve();
      });

      app.use(database.middleware);
      app.use(function*(){
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(this).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      });

      request(app.callback())
      .get('/')
      .end(done);
    });

    it('should throw an Error if any of the registered database providers fails to provide a connection', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      sinon.stub(mysqlProvider, 'getTransactionConnection', function() {
        return Promise.resolve(mysqlConnection);
      });
      sinon.stub(postgresProvider, 'getTransactionConnection', function() {
        return Promise.reject(new Error());
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function() {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function() {
        return Promise.resolve();
      });

      const randomMessage = Math.random().toString();
      app.use(function*(next) {
        try {
          yield next;
        } catch (err) {
          this.status = 500;
          this.body = randomMessage;
        }
      });
      app.use(database.middleware);

      request(app.callback()).get('/').expect(500, randomMessage, done);
    });

    it('should end all open transactions (close/commit connections) when the middleware chain wraps up', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null), postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function() {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function() {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function() {
        return Promise.resolve(null);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function() {
        return Promise.resolve(null);
      });

      app.use(database.middleware);
      app.use(function*(){
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(this).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      });

      request(app.callback())
      .get('/')
      .expect(function() {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      })
      .end(done);
    });

    it('should end all open transactions (close/rollback connections) when an exception is thrown in the middleware chain', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null), postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function() {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function() {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function() {
        return Promise.resolve(null);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function() {
        return Promise.resolve(null);
      });

      app.use(function*(next) {
        try {
          yield next;
        } catch (err) {
          this.status = 300;
        }
      });
      app.use(database.middleware);
      app.use(function*(){
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(this).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        throw new Error();
      });

      request(app.callback())
      .get('/')
      .expect(function() {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      })
      .expect(300, done);
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when any open transactions fail to close/commit when res.end() is called', function(done) {
      //reload database so it picks up database providers
      Ravel.set('database providers', [mysqlProvider, postgresProvider]);
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null), postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function() {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function() {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function() {
        return Promise.reject(new Error());
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function() {
        return Promise.resolve();
      });

      app.use(function*(next) {
        try {
          yield next;
        } catch (err) {
          this.status = 500;
        }
      });
      app.use(database.middleware);
      app.use(function*(){
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(this).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        this.status = 200;
        this.body = {};
      });

      request(app.callback())
      .get('/')
      .expect(function() {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      })
      .expect(500, done);
    });
  });

  // describe('#scoped.enter()', function() {
  //   it('should throw a Ravel.ApplicationError.IllegalValue when no database providers are registered', function(done) {
  //     const scopeForTransaction = sinon.stub();
  //     function test() {
  //       database.scoped.enter(scopeForTransaction);
  //     }
  //     expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
  //     done();
  //   });
  //
  //   it('should populate scoped callback with a dictionary of open database connections when providers are registered', function(done) {
  //     //reload database so it picks up database providers
  //     Ravel.set('database providers', [mysqlProvider, postgresProvider]);
  //     database = require('../../lib/db/database')(Ravel);
  //     const mysqlConnection = {}, postgresConnection = {};
  //     const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, mysqlConnection);
  //     });
  //     const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, postgresConnection);
  //     });
  //     const scopeForTransaction = sinon.stub();
  //     database.scoped.enter(scopeForTransaction);
  //     expect(mysqlGetTransactionSpy).to.have.been.called;
  //     expect(postgresGetTransactionSpy).to.have.been.called;
  //     expect(scopeForTransaction).to.have.been.calledWithMatch({
  //       mysql: mysqlConnection,
  //       postgres: postgresConnection
  //     });
  //     done();
  //   });
  //
  //   it('should call actual callback with an error if any of the registered database providers fails to provider a connection', function(done) {
  //     //reload database so it picks up database providers
  //     Ravel.set('database providers', [mysqlProvider, postgresProvider]);
  //     database = require('../../lib/db/database')(Ravel);
  //     const mysqlConnection = {};
  //     const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, mysqlConnection);
  //     });
  //     const error = new Error();
  //     const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
  //       callback(error, null);
  //     });
  //     const scopeForTransaction = sinon.stub();
  //     const actualCallback = sinon.stub();
  //     database.scoped.enter(scopeForTransaction, actualCallback);
  //     expect(mysqlGetTransactionSpy).to.have.been.called;
  //     expect(postgresGetTransactionSpy).to.have.been.called;
  //     expect(actualCallback).to.have.been.calledWith(error);
  //     done();
  //   });
  //
  //   it('should end all open transactions (close/commit connections) when exitTransaction is called with no errors', function(done) {
  //     //reload database so it picks up database providers
  //     Ravel.set('database providers', [mysqlProvider, postgresProvider]);
  //     database = require('../../lib/db/database')(Ravel);
  //     const mysqlConnection = {}, postgresConnection = {};
  //     const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, mysqlConnection);
  //     });
  //     const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(null);
  //     });
  //     const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, postgresConnection);
  //     });
  //     const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(null);
  //     });
  //     const actualCallback = sinon.stub();
  //     database.scoped.enter(function(connections, exitTransaction) {
  //       expect(connections).to.deep.equal({
  //         mysql: mysqlConnection,
  //         postgres: postgresConnection
  //       });
  //       exitTransaction(null, {});
  //     }, actualCallback);
  //     expect(mysqlGetTransactionSpy).to.have.been.called;
  //     expect(postgresGetTransactionSpy).to.have.been.called;
  //     expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
  //     expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
  //     expect(actualCallback).to.have.been.calledWith(null);
  //     done();
  //   });
  //
  //   it('should end all open transactions (close/rollback connections) when exitTransaction is called with an error', function(done) {
  //     //reload database so it picks up database providers
  //     Ravel.set('database providers', [mysqlProvider, postgresProvider]);
  //     database = require('../../lib/db/database')(Ravel);
  //     const mysqlConnection = {}, postgresConnection = {};
  //     const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, mysqlConnection);
  //     });
  //     const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(null);
  //     });
  //     const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, postgresConnection);
  //     });
  //     const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(null);
  //     });
  //     const actualCallback = sinon.stub();
  //     const error = new Error();
  //     database.scoped.enter(function(connections, exitTransaction) {
  //       expect(connections).to.deep.equal({
  //         mysql: mysqlConnection,
  //         postgres: postgresConnection
  //       });
  //       exitTransaction(error);
  //     }, actualCallback);
  //     expect(mysqlGetTransactionSpy).to.have.been.called;
  //     expect(postgresGetTransactionSpy).to.have.been.called;
  //     expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
  //     expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
  //     expect(actualCallback).to.have.been.calledWith(error);
  //     done();
  //   });
  //
  //   it('should actualCallback with a database-related error when any open transactions fail to close/commit after exitTransaction is called with no errors', function(done) {
  //     //reload database so it picks up database providers
  //     Ravel.set('database providers', [mysqlProvider, postgresProvider]);
  //     database = require('../../lib/db/database')(Ravel);
  //     const mysqlConnection = {}, postgresConnection = {};
  //     const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, mysqlConnection);
  //     });
  //     const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(null);
  //     });
  //     const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function(callback) {
  //       callback(null, postgresConnection);
  //     });
  //     const error = new Error();
  //     const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function(conn, shouldCommit, callback) {
  //       callback(error);
  //     });
  //     const actualCallback = sinon.stub();
  //     database.scoped.enter(function(connections, exitTransaction) {
  //       expect(connections).to.deep.equal({
  //         mysql: mysqlConnection,
  //         postgres: postgresConnection
  //       });
  //       exitTransaction(null, {});
  //     }, actualCallback);
  //     expect(mysqlGetTransactionSpy).to.have.been.called;
  //     expect(postgresGetTransactionSpy).to.have.been.called;
  //     expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
  //     expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
  //     expect(actualCallback).to.have.been.calledWith(error);
  //     done();
  //   });
  // });
});
