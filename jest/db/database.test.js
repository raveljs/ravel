describe('db/database', () => {
  let Ravel, DatabaseProvider, ravelApp, Resource, Module, inject, mysqlProvider, postgresProvider, mysqlConnection, postgresConnection;
  beforeEach(() => {
    Ravel = require('../../lib/ravel');
    ravelApp = new Ravel();
    ravelApp.set('keygrip keys', ['abc']);
    ravelApp.set('log level', ravelApp.$log.NONE);
    DatabaseProvider = Ravel.DatabaseProvider;
    Resource = Ravel.Resource;
    Module = Ravel.Module;
    inject = Ravel.inject;
    // mock a couple of providers for us to use
    mysqlProvider = new DatabaseProvider(ravelApp, 'mysql');
    postgresProvider = new DatabaseProvider(ravelApp, 'postgres');

    // mock stuff
    mysqlConnection = Object.create(null);
    postgresConnection = Object.create(null);
    mysqlProvider.getTransactionConnection = jest.fn(function () {
      return Promise.resolve(mysqlConnection);
    });
    postgresProvider.getTransactionConnection = jest.fn(function () {
      return Promise.resolve(postgresConnection);
    });
    mysqlProvider.exitTransaction = jest.fn(function () {
      return Promise.resolve();
    });
    postgresProvider.exitTransaction = jest.fn(function () {
      return Promise.resolve();
    });
  });

  describe('#middleware()', () => {
    it('should populate context.transaction with an empty dictionary of database connection objects when no database providers are registered.', async () => {
      @Resource('/')
      class R {
        getAll (ctx) {
          expect(ctx.transaction).toEqual({});
        }
      }
      ravelApp.load(R);
      await ravelApp.init();

      await request(ravelApp.callback).get('/');
    });

    it('should populate req.transaction with a dictionary of open database connections when providers are registered', async () => {
      @Resource('/')
      class R {
        @Resource.transaction
        getAll (ctx) {
          expect(mysqlProvider.getTransactionConnection).toHaveBeenCalledTimes(1);
          expect(postgresProvider.getTransactionConnection).toHaveBeenCalledTimes(1);
          expect(ctx).to.have.a.property('transaction').toEqual({
            mysql: mysqlConnection,
            postgres: postgresConnection
          });
        }
      }
      ravelApp.load(R);
      await ravelApp.init();
      await request(ravelApp.callback).get('/');
      await ravelApp.listen();
      await ravelApp.close();
    });

    it('should populate req.transaction with a dictionary of only the correct open database connections when providers are requested by name', async () => {
      @Resource('/')
      @Resource.transaction('postgres')
      class R {
        getAll (ctx) {
          expect(mysqlProvider.getTransactionConnection).not.toHaveBeenCalled;
          expect(postgresProvider.getTransactionConnection).toHaveBeenCalled;
          expect(ctx.transaction).toEqual({
            postgres: postgresConnection
          });
        }
      }
      ravelApp.load(R);
      await ravelApp.init();

      await request(ravelApp.callback).get('/');
    });

    it('should throw an Error if any of the registered database providers fails to provide a connection', async () => {
      postgresProvider.getTransactionConnection = jest.fn(function () {
        return Promise.reject(new Error());
      });
      @Resource('/')
      class R {
        @Resource.transaction('postgres')
        getAll (ctx) { }
      }
      ravelApp.load(R);
      await ravelApp.init();
      const res = await request(ravelApp.callback).get('/');
      expect(res.status).toBe(500);
    });

    it('should end all open transactions (close/commit connections) when the middleware chain wraps up', async () => {
      @Resource('/')
      class R {
        @Resource.transaction
        getAll (ctx) { }
      }
      ravelApp.load(R);
      await ravelApp.init();

      await request(ravelApp.callback).get('/');
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, true);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, true);
    });

    it('should end all open transactions (close/rollback connections) when an exception is thrown in the middleware chain', async () => {
      @Resource('/')
      class R {
        @Resource.transaction
        getAll (ctx) {
          throw new ravelApp.$err.NotFound();
        }
      }
      ravelApp.load(R);
      await ravelApp.init();
      const res = await request(ravelApp.callback).get('/');
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, false);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, false);
      expect(res.status).toBe(404);
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when any open transactions fail to close/commit when res.end() is called', async () => {
      mysqlProvider.exitTransaction = jest.fn(function () {
        return Promise.reject(new Error());
      });
      @Resource('/')
      class R {
        @Resource.transaction
        getAll (ctx) { }
      }
      ravelApp.load(R);
      await ravelApp.init();

      const res = await request(ravelApp.callback).get('/');
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, false);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, false);
      expect(res.status).toBe(500);
    });
  });

  describe('#scoped()', () => {
    it('should populate scoped context with a dictionary of open database connections when providers are registered', async () => {
      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped(async function (ctx) {
            expect(mysqlProvider.getTransactionConnection).toHaveBeenCalled;
            expect(postgresProvider.getTransactionConnection).toHaveBeenCalled;
            expect(ctx.transaction).toEqual({
              mysql: mysqlConnection,
              postgres: postgresConnection
            });
          });
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      return ravelApp.module('test').method();
    });

    it('should populate scoped context with a dictionary of the correct open database connections when providers are requested by name', async () => {
      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped('postgres', async function (ctx) {
            expect(mysqlProvider.getTransactionConnection).not.toHaveBeenCalled;
            expect(postgresProvider.getTransactionConnection).toHaveBeenCalled;
            expect(ctx.transaction).toEqual({
              postgres: postgresConnection
            });
          });
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      return ravelApp.module('test').method();
    });

    it('should throw an exception if any of the registered database providers fails to provide a connection', async () => {
      mysqlProvider.getTransactionConnection = jest.fn(function () {
        return Promise.reject(new Error());
      });

      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped('mysql', async function (ctx) {
            expect(mysqlProvider.getTransactionConnection).toHaveBeenCalled;
            expect(postgresProvider.getTransactionConnection).not.toHaveBeenCalled;
            expect(ctx.transaction).toEqual({
              postgres: postgresConnection
            });
          });
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      await expect(ravelApp.module('test').method()).rejects.toThrow(Error);
    });

    it('should end all open transactions (close/commit connections) when inGen is finished executing', async () => {
      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped(async function (ctx) {
            expect(mysqlProvider.getTransactionConnection).toHaveBeenCalled;
            expect(postgresProvider.getTransactionConnection).toHaveBeenCalled;
            expect(ctx.transaction).toEqual({
              mysql: mysqlConnection,
              postgres: postgresConnection
            });
          });
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      await ravelApp.module('test').method();
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, true);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, true);
    });

    it('should end all open transactions (close/rollback connections) when inGen throws an exception', async () => {
      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped(async function (ctx) {
            expect(mysqlProvider.getTransactionConnection).toHaveBeenCalled;
            expect(postgresProvider.getTransactionConnection).toHaveBeenCalled;
            expect(ctx.transaction).toEqual({
              mysql: mysqlConnection,
              postgres: postgresConnection
            });
            throw new Error();
          });
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      try {
        await ravelApp.module('test').method();
      } catch (err) {
        // do nothing
      }
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, false);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, false);
    });

    it('should reject its returned promise when any connection fails to exit cleanly', async () => {
      postgresProvider.exitTransaction = jest.fn(function () {
        return Promise.reject(new Error()); // eslint-disable-line prefer-promise-reject-errors
      });
      @Module('test')
      @inject('$db')
      class M {
        constructor ($db) {
          this.$db = $db;
        }
        method () {
          return this.$db.scoped(async function (ctx) {});
        }
      }
      ravelApp.load(M);
      await ravelApp.init();
      await expect(ravelApp.module('test').method()).rejects.toThrow(Error);
      // wait a bit to check closers, since the method will reject the
      // second a connection-closer fails, but will still run the others afterwards.
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mysqlProvider.exitTransaction).toHaveBeenCalledWith(mysqlConnection, false);
      expect(postgresProvider.exitTransaction).toHaveBeenCalledWith(postgresConnection, false);
    });

    it('should populate req.transaction with an empty dictionary if no providers are registered', async () => {
      ravelApp = new Ravel();
      ravelApp.set('keygrip keys', ['abc']);
      ravelApp.set('log level', ravelApp.$log.NONE);
      @Resource('/')
      @Resource.transaction('postgres')
      class R {
        getAll (ctx) {
          expect(ctx.transaction).toEqual({});
        }
      }
      ravelApp.load(R);
      await ravelApp.init();

      await request(ravelApp.callback).get('/');
    });
  });
});
