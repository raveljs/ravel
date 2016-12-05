'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
const sinon = require('sinon');
const mockery = require('mockery');
const Koa = require('koa');
const request = require('supertest');

let Ravel, DatabaseProvider, app, database, mysqlProvider, postgresProvider;

describe('db/database', () => {
  beforeEach((done) => {
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });

    app = new Koa();
    Ravel = new (require('../../lib/ravel'))();
    DatabaseProvider = require('../../lib/ravel').DatabaseProvider;
    Ravel.log.setLevel('NONE');
    Ravel.kvstore = {}; // mock Ravel.kvstore, since we're not actually starting Ravel.

    // load database module
    database = require('../../lib/db/database')(Ravel);

    done();
  });

  afterEach((done) => {
    app = undefined;
    Ravel = undefined;
    DatabaseProvider = undefined;
    mysqlProvider = undefined;
    postgresProvider = undefined;
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('#middleware()', () => {
    it('should populate context.transaction with an empty dictionary of database connection objects when no database providers are registered.', (done) => {
      app.use(database.middleware());
      app.use(async function (ctx) {
        expect(ctx).to.have.a.property('transaction').that.deep.equals({});
      });

      request(app.callback())
      .get('/')
      .end(done);
    });

    it('should populate req.transaction with a dictionary of open database connections when providers are registered', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      // mock stuff
      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      app.use(database.middleware());
      app.use(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      });

      request(app.callback())
      .get('/')
      .end(done);
    });

    it('should populate req.transaction with a dictionary of only the correct open database connections when providers are requested by name', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      // mock stuff
      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      app.use(database.middleware('postgres'));
      app.use(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.not.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          postgres: postgresConnection
        });
      });

      request(app.callback())
      .get('/')
      .end(done);
    });

    it('should throw an Error if any of the registered database providers fails to provide a connection', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.reject(new Error());
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      const randomMessage = Math.random().toString();
      app.use(async function (ctx, next) {
        try {
          await next();
        } catch (err) {
          ctx.status = 500;
          ctx.body = randomMessage;
        }
      });
      app.use(database.middleware());

      request(app.callback()).get('/').expect(500, randomMessage, done);
    });

    it('should end all open transactions (close/commit connections) when the middleware chain wraps up', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve(null);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve(null);
      });

      app.use(database.middleware());
      app.use(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      });

      request(app.callback())
      .get('/')
      .expect(() => {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, true);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, true);
      })
      .end(done);
    });

    it('should end all open transactions (close/rollback connections) when an exception is thrown in the middleware chain', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve(null);
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve(null);
      });

      app.use(async function (ctx, next) {
        try {
          await next();
        } catch (err) {
          ctx.status = 300;
        }
      });
      app.use(database.middleware());
      app.use(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        throw new Error();
      });

      request(app.callback())
      .get('/')
      .expect(() => {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      })
      .expect(300, done);
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when any open transactions fail to close/commit when res.end() is called', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.reject(new Error());
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      app.use(async function (ctx, next) {
        try {
          await next();
        } catch (err) {
          ctx.status = 500;
        }
      });
      app.use(database.middleware());
      app.use(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        ctx.status = 200;
        ctx.body = {};
      });

      request(app.callback())
      .get('/')
      .expect(() => {
        expect(mysqlExitTransactionSpy).to.have.been.calledWith(mysqlConnection, false);
        expect(postgresExitTransactionSpy).to.have.been.calledWith(postgresConnection, false);
      })
      .expect(500, done);
    });
  });

  describe('#scoped()', () => {
    it('should populate scoped context with a dictionary of open database connections when providers are registered', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      database.scoped(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        done();
      });
    });

    it('should populate scoped context with a dictionary of the correct open database connections when providers are requested by name', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      database.scoped('postgres', async function (ctx) {
        expect(mysqlGetTransactionSpy).to.not.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          postgres: postgresConnection
        });
        done();
      });
    });

    it('should throw an exception if any of the registered database providers fails to provide a connection', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.reject(new Error());
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      const promise = database.scoped(async () => {
      });
      expect(promise).to.eventually.be.rejectedWith(Error);
      expect(mysqlGetTransactionSpy).to.have.been.called;
      expect(postgresGetTransactionSpy).to.have.been.called;
      done();
    });

    it('should end all open transactions (close/commit connections) when inGen is finished executing', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      database.scoped(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      }).then(() => {
        expect(mysqlExitTransactionSpy).to.have.been.called;
        expect(postgresExitTransactionSpy).to.have.been.called;
        done();
      });
    });

    it('should end all open transactions (close/rollback connections) when inGen throws an exception', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });

      database.scoped(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
        throw new Error();
      })
      .then(() => {
        throw new Error('Promise should have rejected!');
      })
      .catch(() => {
        expect(mysqlExitTransactionSpy).to.have.been.called;
        expect(postgresExitTransactionSpy).to.have.been.called;
        done();
      });
    });

    it('should reject its returned promise when any connection fails to exit cleanly', (done) => {
      // mock a couple of providers for us to use
      mysqlProvider = new DatabaseProvider(Ravel, 'mysql');
      postgresProvider = new DatabaseProvider(Ravel, 'postgres');
      // reload database so it picks up database providers
      database = require('../../lib/db/database')(Ravel);

      const mysqlConnection = Object.create(null);
      const postgresConnection = Object.create(null);
      const mysqlGetTransactionSpy = sinon.stub(mysqlProvider, 'getTransactionConnection', function () {
        return Promise.resolve(mysqlConnection);
      });
      const postgresGetTransactionSpy = sinon.stub(postgresProvider, 'getTransactionConnection', function () {
        return Promise.resolve(postgresConnection);
      });
      const mysqlExitTransactionSpy = sinon.stub(mysqlProvider, 'exitTransaction', function () {
        return Promise.resolve();
      });
      const postgresExitTransactionSpy = sinon.stub(postgresProvider, 'exitTransaction', function () {
        return Promise.reject(null);
      });

      database.scoped(async function (ctx) {
        expect(mysqlGetTransactionSpy).to.have.been.called;
        expect(postgresGetTransactionSpy).to.have.been.called;
        expect(ctx).to.have.a.property('transaction').that.deep.equals({
          mysql: mysqlConnection,
          postgres: postgresConnection
        });
      })
      .then(() => {
        throw new Error('Promise should have rejected!');
      })
      .catch(() => {
        expect(mysqlExitTransactionSpy).to.have.been.called;
        expect(postgresExitTransactionSpy).to.have.been.called;
        done();
      });
    });
  });
});
