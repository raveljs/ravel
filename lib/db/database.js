'use strict';

const sRavelInstance = Symbol.for('_ravelInstance');
const sOpenConnections = Symbol.for('_openConnections');
const sCloseConnections = Symbol.for('_closeConnections');

/**
 * Database transaction support for `ravel` applications provided in two ways:
 *  - Koa middlware (transaction-per-request): Will open and close connections
 *    automatically and manage rollbacks when errors are thrown. This mechanism
 *    is exposed via the [transaction](#transaction) decorator.
 *  - Scoped transaction: For use outside of the context of an explicit web route.
 *    Useful for tasks such as database migration
 */
class TransactionFactory {
  /**
   * @param {Ravel} ravelInstance - An instance of a Ravel app.
   * @private
   */
  constructor (ravelInstance) {
    this[sRavelInstance] = ravelInstance;
  }

  /**
   * Koa Middleware which populates a request object with
   * an open transaction for all configured database providers.
   * This transaction will be automatically rolled back or committed
   * when the response is finished (if the given provider suports
   * rollbacks).
   *
   * @param {...String} providerNames - The names of which providers
   *                    to open connections for. Optional.
   * @private
   */
  middleware (...providerNames) {
    const self = this;
    return async function (ctx, next) {
      const closers = [];
      ctx.transaction = await self[sOpenConnections](providerNames, closers);
      // try awaiting on next middleware and committing statements afterwards. Rollback if there was an error
      try {
        await next();
        await self[sCloseConnections](closers, true);
      } catch (err) {
        try {
          await self[sCloseConnections](closers, false);
        } catch (e) { }
        throw err;
      }
    };
  }

  /**
   * For use when middlewareTransaction can't be used (in other words,
   * outside of `Routes` and `Resources`). This method is made available through
   * `Module.db.scoped`. See [`Module.db.scoped`](#Module#db) for examples.
   *
   * @param {Array} args - Arguments beginning with 0-N Strings representing providers to open connections on,
   *                     followed by an async function which Will be provided with a context which contains
   *                     this.transaction.
   * @returns {Promise} A Promise which is resolved when inGen is finished running, or rejected if
   *                   an error was thrown.
   */
  async scoped (...args) {
    const scope = args[args.length - 1];
    const provs = args.slice(0, args.length - 1);

    const ctx = Object.create(null);
    return this.middleware(...provs)(ctx, async () => scope(ctx));
  }
}

/**
 * Private function for opening all transactional connections
 * to the registered database providers.
 *
 * @param {Array<String>} providerNames - The names of which providers to open connections for. If empty, all
 *                                        connections will be opened.
 * @param {Array} closers - A place to put connection closing closures.
 * @private
 *
 */
TransactionFactory.prototype[sOpenConnections] = function (providerNames, closers) {
  // guarantee provider names are unique
  let uniqueProviderNames = new Set();
  providerNames.forEach(n => uniqueProviderNames.add(n));
  uniqueProviderNames = Array.from(uniqueProviderNames);

  return new Promise((resolve, reject) => {
    const providers = this[sRavelInstance].databaseProviders();
    if (providers.length === 0) {
      this[sRavelInstance].log.debug('Middleware transaction attempted, but no database providers are registered.');
      // resolve with no connections
      resolve(Object.create(null));
    } else {
      const sConnName = Symbol.for('name');
      const toOpen = providerNames.length === 0 ? providers : providers.filter(p => providerNames.indexOf(p.name) >= 0);
      // index provider promises in an array and use co to open connections.

      Promise.all(toOpen.map(p => {
        return p.getTransactionConnection()
        // chain an extra then() on the end, which will store connection closing functions
        // which will allow us to clean up if one of the opens fails.
        .then((conn) => {
          closers.push((shouldCommit) => {
            return p.exitTransaction(conn, shouldCommit);
          });
          conn[sConnName] = p.name; // store name in promise for later
          return conn;
        });
      })).then((connections) => {
        // convert array into map with provider names
        const connObj = Object.create(null);
        for (const c of connections) {
          connObj[c[sConnName]] = c;
        }
        resolve(connObj);
      }).catch((err) => {
        this[sCloseConnections](closers, false);
        reject(err);
      });
    }
  });
};

/**
 * Private function for closing all open transactional connections.
 *
 * @param {Array} closers - A place to put connection-closing closures.
 * @param {boolean} shouldCommit - Whether or not to commit the transaction.
 * @private
 */
TransactionFactory.prototype[sCloseConnections] = function (closers, shouldCommit) {
  return Promise.all(closers.map(closer => {
    return closer(shouldCommit);
  })).catch((err) => {
    throw err;
  });
};

/**
 * Populates a `ravel instance` with a TransactionFactory.
 *
 * @private
 * @param {Ravel} ravelInstance - An instance of a Ravel app.
 */
module.exports = function (ravelInstance) {
  ravelInstance.registerParameter('always rollback transactions', false);

  return new TransactionFactory(ravelInstance);
};
